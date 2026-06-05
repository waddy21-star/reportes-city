'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Camera,
  X,
  Plus,
  Send,
  Trash2,
  CheckSquare,
  Thermometer,
  Wind,
} from 'lucide-react'
import { parseDepts, DEPT_LABELS, ALL_DEPARTMENTS } from '@/lib/departments'
import { AC_TYPES, LOCATIONS, LOCAL_CHECKLIST_ITEMS } from '@/lib/refrigeracion'
import { enqueueReport } from '@/lib/offline'
import type {
  Task,
  ReportDetail,
  ReportTaskDetail,
  ReportTaskCheckItem,
  LocalRecordRow,
  ReportCreateInput,
} from '@/types'

const departmentLabels: Record<string, string> = DEPT_LABELS

interface TaskState {
  taskId: string
  expanded: boolean
  hasIncident: boolean
  incidentNote: string
  checkedItems: Record<string, boolean>
}

interface LocalRecord {
  localName: string
  acType: string
  location: string
  items: { id: number; label: string; checked: boolean; value?: string }[]
  hasIssue: boolean
  issueNote: string
}

interface LocalFormState {
  localName: string
  acType: string
  location: string
  checkedItems: Record<number, boolean>
  itemValues: Record<number, string>
  hasIssue: boolean
  issueNote: string
}

const emptyLocalForm = (): LocalFormState => ({
  localName: '',
  acType: 'MINI_SPLIT',
  location: 'NIVEL_1',
  checkedItems: {},
  itemValues: {},
  hasIssue: false,
  issueNote: '',
})

function NewReportInner() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const deptParam = searchParams.get('dept')
  const sigRef = useRef<SignatureCanvas>(null)

  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState<'NORMAL' | 'URGENTE'>('NORMAL')
  const [notes, setNotes] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({})
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [sigEmpty, setSigEmpty] = useState(true)

  // Refrigeración tabs
  const [refrigTab, setRefrigTab] = useState<'MALL' | 'LOCALES'>('MALL')
  const [localRecords, setLocalRecords] = useState<LocalRecord[]>([])
  const [showLocalForm, setShowLocalForm] = useState(false)
  const [localForm, setLocalForm] = useState<LocalFormState>(emptyLocalForm())

  // Custom task
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskChecklist, setNewTaskChecklist] = useState('')

  // Inline checklist item
  const [addingItemToTask, setAddingItemToTask] = useState<string | null>(null)
  const [newItemLabel, setNewItemLabel] = useState('')

  // Track report created to avoid duplicates if photo upload fails on retry
  const createdReportIdRef = useRef<string | null>(null)

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Modo edición
  const [editingStatus, setEditingStatus] = useState<string | null>(null)
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; path: string }[]>([])
  const [existingSignature, setExistingSignature] = useState<string | null>(null)
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [loadingReport, setLoadingReport] = useState(!!editId)
  // Datos del reporte a editar, aplicados después de cargar las tareas del depto.
  const hydrateRef = useRef<ReportDetail | null>(null)

  // Firma: canvas responsivo (corrige el desfase del trazo)
  const sigWrapRef = useRef<HTMLDivElement>(null)
  const [sigWidth, setSigWidth] = useState(0)
  const SIG_HEIGHT = 180

  const departments = session?.user?.role === 'ADMIN'
    ? [...ALL_DEPARTMENTS]
    : parseDepts(session?.user?.department)

  // Modo edición: cargar el reporte existente una sola vez.
  useEffect(() => {
    if (!editId) return
    fetch(`/api/reports/${editId}`)
      .then(async r => {
        if (!r.ok) { setLoadingReport(false); return }
        const data: ReportDetail = await r.json()
        hydrateRef.current = data
        setEditingStatus(data.status)
        setExistingSignature(data.signature || null)
        setExistingPhotos((data.photos || []).map((p) => ({ id: p.id, path: p.path })))
        setDepartment(data.department) // dispara la carga de tareas + hidratación
        setLoadingReport(false)
      })
      .catch(() => setLoadingReport(false))
  }, [editId])

  // Preselección de departamento al crear (desde el sidebar o si solo tiene uno).
  useEffect(() => {
    if (editId) return
    if (deptParam && departments.includes(deptParam)) {
      setDepartment(deptParam)
    } else if (departments.length === 1) {
      setDepartment(departments[0])
    }
  }, [session, deptParam])

  // Mide el ancho real del contenedor de la firma para que el lienzo tenga
  // la MISMA resolución que su tamaño en pantalla (evita el desfase del trazo).
  useEffect(() => {
    const measure = () => {
      if (sigWrapRef.current) setSigWidth(sigWrapRef.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [department, loadingReport])

  useEffect(() => {
    if (!department) return
    // Reset all report state when department changes so no cross-department data leaks
    setLocalRecords([])
    setRefrigTab('MALL')
    setShowLocalForm(false)
    setLocalForm(emptyLocalForm())
    setPhotos([])
    setNotes('')
    setLevel('NORMAL')
    createdReportIdRef.current = null
    setLoadingTasks(true)
    fetch(`/api/tasks?department=${department}`)
      .then(r => r.json())
      .then((data: Task[]) => {
        setTasks(data)
        const states: Record<string, TaskState> = {}
        data.forEach(t => {
          states[t.id] = {
            taskId: t.id,
            expanded: false,
            hasIncident: false,
            incidentNote: '',
            checkedItems: {},
          }
        })

        // Si estamos editando y el reporte cargado es de este departamento,
        // aplicar sus valores (tareas marcadas, incidentes, notas, etc.).
        const rep = hydrateRef.current
        if (rep && rep.department === department) {
          rep.reportTasks?.forEach((rt: ReportTaskDetail) => {
            const st = states[rt.taskId]
            if (!st) return
            st.hasIncident = rt.hasIncident
            st.incidentNote = rt.incidentNote || ''
            st.expanded = rt.hasIncident
            rt.checkItems?.forEach((ci: ReportTaskCheckItem) => {
              st.checkedItems[ci.checklistItemId] = ci.checked
            })
          })
          setLevel(rep.level === 'URGENTE' ? 'URGENTE' : 'NORMAL')
          setNotes(rep.notes || '')
          setLocalRecords(
            (rep.localRecords || []).map((lr: LocalRecordRow) => {
              let items: { id: number; label: string; checked: boolean; value?: string }[] = []
              try { items = JSON.parse(lr.items) } catch {}
              return {
                localName: lr.localName,
                acType: lr.acType,
                location: lr.location,
                items,
                hasIssue: lr.hasIssue,
                issueNote: lr.issueNote || '',
              }
            })
          )
          hydrateRef.current = null
        }

        setTaskStates(states)
        setLoadingTasks(false)
      })
      .catch(() => setLoadingTasks(false))
  }, [department])

  const mallTasks = tasks.filter(t => t.timeSlot === 'MALL')
  const nonMallTasks = tasks.filter(t => t.timeSlot !== 'MALL')

  const toggleExpand = (taskId: string) => {
    setTaskStates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], expanded: !prev[taskId].expanded },
    }))
  }

  const toggleIncident = (taskId: string) => {
    setTaskStates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], hasIncident: !prev[taskId].hasIncident },
    }))
  }

  const setIncidentNote = (taskId: string, note: string) => {
    setTaskStates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], incidentNote: note },
    }))
  }

  const toggleCheckItem = (taskId: string, itemId: string) => {
    setTaskStates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        checkedItems: {
          ...prev[taskId].checkedItems,
          [itemId]: !prev[taskId].checkedItems[itemId],
        },
      },
    }))
  }

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, { file, preview: ev.target?.result as string }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddCustomTask = async () => {
    if (!newTaskName.trim() || !department) return
    const checkItems = newTaskChecklist
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTaskName, department, checkItems }),
      })
      const newTask = await res.json()
      setTasks(prev => [...prev, newTask])
      setTaskStates(prev => ({
        ...prev,
        [newTask.id]: { taskId: newTask.id, expanded: false, hasIncident: false, incidentNote: '', checkedItems: {} },
      }))
      setNewTaskName('')
      setNewTaskChecklist('')
      setShowAddTask(false)
    } catch {
      alert('Error al agregar tarea')
    }
  }

  const handleSaveLocal = () => {
    if (!localForm.localName.trim()) {
      alert('Ingrese el nombre del local')
      return
    }
    const record: LocalRecord = {
      localName: localForm.localName.trim(),
      acType: localForm.acType,
      location: localForm.location,
      items: LOCAL_CHECKLIST_ITEMS.map(item => ({
        id: item.id,
        label: item.label,
        checked: localForm.checkedItems[item.id] || false,
        ...(item.hasValue ? { value: localForm.itemValues[item.id] || '' } : {}),
      })),
      hasIssue: localForm.hasIssue,
      issueNote: localForm.issueNote,
    }
    setLocalRecords(prev => [...prev, record])
    setLocalForm(emptyLocalForm())
    setShowLocalForm(false)
  }

  const removeLocalRecord = (idx: number) => {
    setLocalRecords(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleLocalCheckItem = (itemId: number) => {
    setLocalForm(prev => ({
      ...prev,
      checkedItems: {
        ...prev.checkedItems,
        [itemId]: !prev.checkedItems[itemId],
      },
    }))
  }

  const buildReportTasks = () => {
    const tasksToSubmit = department === 'REFRIGERACION' ? mallTasks : nonMallTasks
    return tasksToSubmit.map(task => {
      const state = taskStates[task.id]
      return {
        taskId: task.id,
        hasIncident: state?.hasIncident || false,
        incidentNote: state?.incidentNote || null,
        checkItems: task.checkItems.map(item => ({
          checklistItemId: item.id,
          checked: state?.checkedItems[item.id] || false,
        })),
      }
    })
  }

  const getSignature = (): string | null => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      return sigRef.current.toDataURL('image/png')
    }
    // En edición, si no firmó de nuevo, se conserva la firma existente.
    return existingSignature
  }

  const handleSubmitWithStatus = async (statusChoice: 'ACTIVO' | 'COMPLETADO') => {
    setShowSaveDialog(false)
    if (!department) return

    setLoading(true)

    try {
      const reportTasks = buildReportTasks()
      const signature = getSignature()

      // ===== Modo edición: PATCH =====
      if (editId) {
        const res = await fetch(`/api/reports/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullEdit: true,
            level,
            status: statusChoice,
            notes,
            signature,
            tasks: reportTasks,
            localRecords: department === 'REFRIGERACION' ? localRecords : [],
            removePhotoIds: removedPhotoIds,
          }),
        })
        if (!res.ok) throw new Error('Error updating report')

        for (const photo of photos) {
          const fd = new FormData()
          fd.append('file', photo.file)
          fd.append('reportId', editId)
          await fetch('/api/upload', { method: 'POST', body: fd })
        }

        router.push(`/reportes/${editId}`)
        return
      }

      // ===== Modo creación: POST =====
      const payload = {
        department,
        level,
        status: statusChoice,
        notes,
        signature,
        tasks: reportTasks,
        localRecords: department === 'REFRIGERACION' ? localRecords : [],
      }

      let reportId = createdReportIdRef.current
      if (!reportId) {
        let res: Response
        try {
          res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } catch {
          // Error de red (servidor caído / sin conexión): guardar offline.
          await saveOffline(payload)
          return
        }

        if (!res.ok) throw new Error('Error creating report')
        const report = await res.json()
        reportId = report.id
        createdReportIdRef.current = reportId
      }

      try {
        for (const photo of photos) {
          const fd = new FormData()
          fd.append('file', photo.file)
          fd.append('reportId', reportId!)
          await fetch('/api/upload', { method: 'POST', body: fd })
        }
      } catch {
        // El reporte ya se creó; si las fotos fallan por red no bloqueamos.
      }

      router.push(`/reportes/${reportId}`)
    } catch {
      alert(editId ? 'Error al guardar los cambios. Intente de nuevo.' : 'Error al crear el reporte. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Guarda el reporte en IndexedDB para sincronizarlo cuando vuelva el servidor.
  const saveOffline = async (payload: ReportCreateInput) => {
    try {
      await enqueueReport({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        payload,
        photos: photos.map(p => ({
          dataURL: p.preview,
          filename: p.file.name || 'foto.jpg',
          type: p.file.type || 'image/jpeg',
        })),
        createdAt: Date.now(),
      })
      window.dispatchEvent(new Event('citymall:pending-changed'))
      alert(
        'No hay conexión con el servidor. El reporte se guardó en este dispositivo y se enviará automáticamente cuando el servidor vuelva a estar disponible.'
      )
      router.push('/reportes')
    } catch {
      alert('No se pudo guardar el reporte localmente. Intente de nuevo.')
    }
  }

  const handleSubmit = () => {
    if (!department) {
      alert('Seleccione un departamento')
      return
    }
    setShowSaveDialog(true)
  }

  const hasIncidents = Object.values(taskStates).some(s => s.hasIncident)

  const acTypeLabel = (value: string) => AC_TYPES.find(t => t.value === value)?.label || value
  const locationLabel = (value: string) => LOCATIONS.find(l => l.value === value)?.label || value

  const handleAddChecklistItem = async (taskId: string) => {
    if (!newItemLabel.trim()) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newItemLabel.trim() }),
      })
      if (!res.ok) throw new Error()
      const newItem = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checkItems: [...t.checkItems, newItem] } : t))
      setTaskStates(prev => ({
        ...prev,
        [taskId]: { ...prev[taskId], checkedItems: { ...prev[taskId].checkedItems, [newItem.id]: false } },
      }))
      setNewItemLabel('')
      setAddingItemToTask(null)
    } catch {
      alert('Error al agregar ítem')
    }
  }

  const renderTaskList = (taskList: Task[], hideTimeSlot?: boolean) => (
    <>
      {loadingTasks ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-400 text-sm">Cargando tareas...</p>
        </div>
      ) : (
        taskList.map(task => {
          const state = taskStates[task.id]
          if (!state) return null
          const checkedCount = Object.values(state.checkedItems).filter(Boolean).length
          const totalItems = task.checkItems.length

          return (
            <div
              key={task.id}
              className="bg-white rounded-2xl shadow-sm border overflow-hidden transition-all"
              style={{
                borderColor: state.hasIncident ? '#D64440' : '#E8ECF0',
                borderWidth: state.hasIncident ? '2px' : '1px',
              }}
            >
              {/* Task header */}
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!hideTimeSlot && task.timeSlot && task.timeSlot !== 'MALL' && (
                        <span
                          className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono"
                          style={{ backgroundColor: '#EEF2FF', color: '#1C3557' }}
                        >
                          {task.timeSlot}
                        </span>
                      )}
                      <span className="font-semibold text-sm" style={{ color: '#1C3557' }}>{task.name}</span>
                      {task.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#F5F7FA', color: '#9CA3AF' }}>Custom</span>
                      )}
                    </div>
                    {totalItems > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{checkedCount}/{totalItems} ítems completados</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Incident toggle */}
                    <button
                      onClick={() => toggleIncident(task.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        backgroundColor: state.hasIncident ? '#D64440' : '#FEF2F2',
                        color: state.hasIncident ? 'white' : '#D64440',
                      }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {state.hasIncident ? 'Incidente' : 'Sin incidente'}
                    </button>

                    {/* Expand toggle */}
                    {(totalItems > 0 || state.hasIncident) && (
                      <button
                        onClick={() => toggleExpand(task.id)}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                        style={{ color: '#9CA3AF' }}
                      >
                        {state.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {state.expanded && (
                <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#F5F7FA', backgroundColor: '#FAFBFC' }}>
                  {/* Checklist */}
                  {(task.checkItems.length > 0 || state.expanded) && (
                    <div className="space-y-2">
                      {task.checkItems.length > 0 && (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lista de verificación</p>
                          {task.checkItems.map(item => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <div
                                onClick={() => toggleCheckItem(task.id, item.id)}
                                className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                                style={{
                                  borderColor: state.checkedItems[item.id] ? '#22C55E' : '#D1D5DB',
                                  backgroundColor: state.checkedItems[item.id] ? '#22C55E' : 'white',
                                }}
                              >
                                {state.checkedItems[item.id] && (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span
                                className="text-sm transition-colors"
                                style={{ color: state.checkedItems[item.id] ? '#9CA3AF' : '#374151', textDecoration: state.checkedItems[item.id] ? 'line-through' : 'none' }}
                                onClick={() => toggleCheckItem(task.id, item.id)}
                              >
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </>
                      )}
                      {/* Inline add item */}
                      {addingItemToTask === task.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={newItemLabel}
                            onChange={e => setNewItemLabel(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddChecklistItem(task.id); if (e.key === 'Escape') setAddingItemToTask(null) }}
                            placeholder="Nuevo ítem..."
                            autoFocus
                            className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#E8ECF0', color: '#374151' }}
                          />
                          <button onClick={() => handleAddChecklistItem(task.id)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: '#22C55E' }}>+</button>
                          <button onClick={() => setAddingItemToTask(null)} className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: '#9CA3AF' }}>✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingItemToTask(task.id); setNewItemLabel('') }}
                          className="flex items-center gap-1 mt-2 text-xs transition-colors"
                          style={{ color: '#D1D5DB' }}
                          onMouseOver={e => (e.currentTarget as HTMLElement).style.color = '#9CA3AF'}
                          onMouseOut={e => (e.currentTarget as HTMLElement).style.color = '#D1D5DB'}
                        >
                          <Plus className="w-3 h-3" />
                          Agregar ítem
                        </button>
                      )}
                    </div>
                  )}

                  {/* Incident note */}
                  {state.hasIncident && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#D64440' }}>
                        Descripción del incidente *
                      </p>
                      <textarea
                        value={state.incidentNote}
                        onChange={e => setIncidentNote(task.id, e.target.value)}
                        placeholder="Describa el incidente ocurrido..."
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none"
                        style={{ borderColor: '#D64440', backgroundColor: 'white', color: '#374151' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Auto-expand if incident */}
              {state.hasIncident && !state.expanded && (
                <div className="border-t px-5 py-3" style={{ borderColor: '#FEF2F2', backgroundColor: '#FEF2F2' }}>
                  <textarea
                    value={state.incidentNote}
                    onChange={e => setIncidentNote(task.id, e.target.value)}
                    placeholder="Describa el incidente ocurrido..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none"
                    style={{ borderColor: '#FECACA', backgroundColor: 'white', color: '#374151' }}
                  />
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )

  const renderGroupedTaskList = (taskList: Task[]) => {
    // Group tasks by timeSlot
    const groups: { slot: string; tasks: Task[] }[] = []
    const seen = new Set<string>()
    taskList.forEach(task => {
      const slot = task.timeSlot || ''
      if (!seen.has(slot)) {
        seen.add(slot)
        groups.push({ slot, tasks: [] })
      }
      groups.find(g => g.slot === slot)!.tasks.push(task)
    })

    return (
      <>
        {loadingTasks ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }}></div>
            <p className="text-gray-400 text-sm">Cargando tareas...</p>
          </div>
        ) : (
          groups.map(({ slot, tasks: groupTasks }) => (
            <div key={slot}>
              {slot && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-px flex-1" style={{ backgroundColor: '#E8ECF0' }} />
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#EEF2FF', color: '#1C3557' }}>
                    {slot}
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: '#E8ECF0' }} />
                </div>
              )}
              <div className="space-y-3 mt-2">
                {renderTaskList(groupTasks, true)}
              </div>
            </div>
          ))
        )}
      </>
    )
  }

  if (loadingReport) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 text-sm">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Banner de edición */}
      {editId && (
        <div className="rounded-2xl p-4 border-2 flex items-center gap-3" style={{ borderColor: '#F47920', backgroundColor: '#FFF7ED' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F47920' }}>
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#1C3557' }}>Editando reporte — {departmentLabels[department] || department}</p>
            <p className="text-xs text-gray-500">Corrija lo necesario y guarde los cambios.</p>
          </div>
        </div>
      )}

      {/* Level selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
        <h2 className="font-bold text-base mb-3" style={{ color: '#1C3557' }}>Nivel de Reporte</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLevel('NORMAL')}
            className="py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all"
            style={{
              borderColor: level === 'NORMAL' ? '#22C55E' : '#E8ECF0',
              backgroundColor: level === 'NORMAL' ? '#F0FDF4' : 'white',
              color: level === 'NORMAL' ? '#16A34A' : '#6B7280',
            }}
          >
            Normal
          </button>
          <button
            onClick={() => setLevel('URGENTE')}
            className="py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2"
            style={{
              borderColor: level === 'URGENTE' ? '#D64440' : '#E8ECF0',
              backgroundColor: level === 'URGENTE' ? '#FEF2F2' : 'white',
              color: level === 'URGENTE' ? '#D64440' : '#6B7280',
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            Urgente
          </button>
        </div>
        {level === 'URGENTE' && (
          <p className="mt-2 text-xs font-medium" style={{ color: '#D64440' }}>
            Este reporte será marcado como urgente y notificado a administración.
          </p>
        )}
      </div>

      {/* Tasks */}
      {department && (
        <div className="space-y-3">
          {department === 'REFRIGERACION' ? (
            <>
              {/* Refrigeración Tabs */}
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-base" style={{ color: '#1C3557' }}>
                  Tareas — Refrigeración
                </h2>
                {hasIncidents && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
                    <AlertTriangle className="w-3 h-3" />
                    Incidentes
                  </span>
                )}
              </div>

              {/* Tab buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setRefrigTab('MALL')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                  style={{
                    borderColor: refrigTab === 'MALL' ? '#8B5CF6' : '#E8ECF0',
                    backgroundColor: refrigTab === 'MALL' ? '#F5F3FF' : 'white',
                    color: refrigTab === 'MALL' ? '#8B5CF6' : '#6B7280',
                  }}
                >
                  <Wind className="w-4 h-4" />
                  Mall
                </button>
                <button
                  onClick={() => setRefrigTab('LOCALES')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                  style={{
                    borderColor: refrigTab === 'LOCALES' ? '#8B5CF6' : '#E8ECF0',
                    backgroundColor: refrigTab === 'LOCALES' ? '#F5F3FF' : 'white',
                    color: refrigTab === 'LOCALES' ? '#8B5CF6' : '#6B7280',
                  }}
                >
                  <Thermometer className="w-4 h-4" />
                  Locales
                  {localRecords.length > 0 && (
                    <span className="ml-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#8B5CF6' }}>
                      {localRecords.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Mall tab */}
              {refrigTab === 'MALL' && (
                <div className="space-y-3">
                  {renderTaskList(mallTasks)}
                  {/* Add custom task */}
                  {!showAddTask ? (
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="w-full py-3.5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      style={{ borderColor: '#E8ECF0', color: '#9CA3AF' }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#F47920'; (e.currentTarget as HTMLElement).style.color = '#F47920' }}
                      onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#E8ECF0'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Tarea Personalizada
                    </button>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4" style={{ borderColor: '#E8ECF0' }}>
                      <h3 className="font-bold text-sm" style={{ color: '#1C3557' }}>Nueva Tarea</h3>
                      <input
                        type="text"
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        placeholder="Nombre de la tarea"
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                        style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                      />
                      <textarea
                        value={newTaskChecklist}
                        onChange={e => setNewTaskChecklist(e.target.value)}
                        placeholder="Ítems del checklist (uno por línea)"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                        style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddCustomTask}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                          style={{ backgroundColor: '#F47920' }}
                        >
                          Agregar
                        </button>
                        <button
                          onClick={() => setShowAddTask(false)}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                          style={{ backgroundColor: '#F5F7FA', color: '#6B7280' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Locales tab */}
              {refrigTab === 'LOCALES' && (
                <div className="space-y-3">
                  {/* Add local button */}
                  {!showLocalForm && (
                    <button
                      onClick={() => setShowLocalForm(true)}
                      className="w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                      style={{ borderColor: '#8B5CF6', color: '#8B5CF6', backgroundColor: '#F5F3FF' }}
                    >
                      <Plus className="w-5 h-5" />
                      Agregar Local
                    </button>
                  )}

                  {/* Local form */}
                  {showLocalForm && (
                    <div className="bg-white rounded-2xl shadow-sm border-2 p-5 space-y-4" style={{ borderColor: '#8B5CF6' }}>
                      <h3 className="font-bold text-base" style={{ color: '#1C3557' }}>Nuevo Local</h3>

                      {/* Local name */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-gray-500">Nombre del Local *</label>
                        <input
                          type="text"
                          value={localForm.localName}
                          onChange={e => setLocalForm(prev => ({ ...prev, localName: e.target.value }))}
                          placeholder="Ej: Local 101 - Zara"
                          className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                          style={{ borderColor: '#E8ECF0', color: '#1C3557', minHeight: '48px' }}
                        />
                      </div>

                      {/* AC Type and Location */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-gray-500">Tipo de AC</label>
                          <select
                            value={localForm.acType}
                            onChange={e => setLocalForm(prev => ({ ...prev, acType: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border text-sm outline-none appearance-none"
                            style={{ borderColor: '#E8ECF0', color: '#1C3557', minHeight: '48px', backgroundColor: 'white' }}
                          >
                            {AC_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-gray-500">Ubicación</label>
                          <select
                            value={localForm.location}
                            onChange={e => setLocalForm(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border text-sm outline-none appearance-none"
                            style={{ borderColor: '#E8ECF0', color: '#1C3557', minHeight: '48px', backgroundColor: 'white' }}
                          >
                            {LOCATIONS.map(l => (
                              <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Checklist */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-500">Lista de Verificación</p>
                        <div className="space-y-1">
                          {LOCAL_CHECKLIST_ITEMS.map(item => (
                            <div key={item.id} className="space-y-1">
                              <button
                                onClick={() => toggleLocalCheckItem(item.id)}
                                className="w-full flex items-center gap-3 px-4 rounded-xl border transition-all text-left"
                                style={{
                                  minHeight: '52px',
                                  borderColor: localForm.checkedItems[item.id] ? '#22C55E' : '#E8ECF0',
                                  backgroundColor: localForm.checkedItems[item.id] ? '#F0FDF4' : 'white',
                                }}
                              >
                                <div
                                  className="w-7 h-7 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                  style={{
                                    borderColor: localForm.checkedItems[item.id] ? '#22C55E' : '#D1D5DB',
                                    backgroundColor: localForm.checkedItems[item.id] ? '#22C55E' : 'white',
                                  }}
                                >
                                  {localForm.checkedItems[item.id] && (
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span
                                  className="text-sm transition-colors"
                                  style={{ color: localForm.checkedItems[item.id] ? '#6B7280' : '#374151' }}
                                >
                                  {item.label}
                                </span>
                              </button>
                              {item.hasValue && localForm.checkedItems[item.id] && (
                                <input
                                  type="text"
                                  value={localForm.itemValues[item.id] || ''}
                                  onChange={e => setLocalForm(prev => ({
                                    ...prev,
                                    itemValues: { ...prev.itemValues, [item.id]: e.target.value },
                                  }))}
                                  placeholder="Valor medido (ej: 220V / 8A)"
                                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                                  style={{ borderColor: '#22C55E', backgroundColor: '#F0FDF4', color: '#374151' }}
                                  onClick={e => e.stopPropagation()}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issue toggle */}
                      <div>
                        <button
                          onClick={() => setLocalForm(prev => ({ ...prev, hasIssue: !prev.hasIssue }))}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 w-full transition-all"
                          style={{
                            borderColor: localForm.hasIssue ? '#D64440' : '#E8ECF0',
                            backgroundColor: localForm.hasIssue ? '#FEF2F2' : 'white',
                            color: localForm.hasIssue ? '#D64440' : '#6B7280',
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-semibold">
                            {localForm.hasIssue ? 'Tiene problema' : '¿Tiene problema?'}
                          </span>
                        </button>
                        {localForm.hasIssue && (
                          <textarea
                            value={localForm.issueNote}
                            onChange={e => setLocalForm(prev => ({ ...prev, issueNote: e.target.value }))}
                            placeholder="Describa el problema encontrado..."
                            rows={3}
                            className="w-full mt-2 px-4 py-3 rounded-xl border text-sm resize-none outline-none"
                            style={{ borderColor: '#FECACA', color: '#374151' }}
                          />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={handleSaveLocal}
                          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-colors"
                          style={{ backgroundColor: '#8B5CF6' }}
                        >
                          Guardar Local
                        </button>
                        <button
                          onClick={() => { setShowLocalForm(false); setLocalForm(emptyLocalForm()) }}
                          className="px-5 py-3.5 rounded-xl text-sm font-medium transition-colors"
                          style={{ backgroundColor: '#F5F7FA', color: '#6B7280' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Local records list */}
                  {localRecords.map((record, idx) => {
                    const checkedCount = record.items.filter(i => i.checked).length
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl shadow-sm border-2 overflow-hidden"
                        style={{ borderColor: record.hasIssue ? '#D64440' : '#8B5CF620' }}
                      >
                        <div className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base" style={{ color: '#1C3557' }}>{record.localName}</h3>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
                                  {acTypeLabel(record.acType)}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#EEF2FF', color: '#1C3557' }}>
                                  {locationLabel(record.location)}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                                  {checkedCount}/{record.items.length} ítems
                                </span>
                                {record.hasIssue && (
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
                                    <AlertTriangle className="w-3 h-3" />
                                    Problema
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeLocalRecord(idx)}
                              className="p-2 rounded-xl transition-colors flex-shrink-0"
                              style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {localRecords.length === 0 && !showLocalForm && (
                    <p className="text-center text-sm text-gray-400 py-4">
                      No hay locales agregados. Presione &quot;Agregar Local&quot; para comenzar.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base" style={{ color: '#1C3557' }}>
                  Tareas — {departmentLabels[department]}
                </h2>
                {hasIncidents && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
                    <AlertTriangle className="w-3 h-3" />
                    Incidentes
                  </span>
                )}
              </div>

              {nonMallTasks.some(t => t.timeSlot) ? renderGroupedTaskList(nonMallTasks) : renderTaskList(nonMallTasks)}

              {/* Add custom task */}
              {!showAddTask ? (
                <button
                  onClick={() => setShowAddTask(true)}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  style={{ borderColor: '#E8ECF0', color: '#9CA3AF' }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#F47920'; (e.currentTarget as HTMLElement).style.color = '#F47920' }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#E8ECF0'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
                >
                  <Plus className="w-4 h-4" />
                  Agregar Tarea Personalizada
                </button>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4" style={{ borderColor: '#E8ECF0' }}>
                  <h3 className="font-bold text-sm" style={{ color: '#1C3557' }}>Nueva Tarea</h3>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={e => setNewTaskName(e.target.value)}
                    placeholder="Nombre de la tarea"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                  />
                  <textarea
                    value={newTaskChecklist}
                    onChange={e => setNewTaskChecklist(e.target.value)}
                    placeholder="Ítems del checklist (uno por línea)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                    style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCustomTask}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: '#F47920' }}
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => setShowAddTask(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={{ backgroundColor: '#F5F7FA', color: '#6B7280' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Photos */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
        <h2 className="font-bold text-base mb-3" style={{ color: '#1C3557' }}>Fotografías</h2>

        {/* Fotos ya guardadas (modo edición) */}
        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {existingPhotos.map(p => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.path} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setRemovedPhotoIds(prev => [...prev, p.id])
                    setExistingPhotos(prev => prev.filter(x => x.id !== p.id))
                  }}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
          style={{ borderColor: '#E8ECF0', color: '#9CA3AF' }}
          onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#F47920'; (e.currentTarget as HTMLElement).style.color = '#F47920' }}
          onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#E8ECF0'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm font-medium">Tomar foto o seleccionar imagen</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handlePhotoAdd}
          />
        </label>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
        <h2 className="font-bold text-base mb-3" style={{ color: '#1C3557' }}>Notas Generales</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observaciones, novedades generales..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
          style={{ borderColor: '#E8ECF0', color: '#374151' }}
        />
      </div>

      {/* Signature */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: '#1C3557' }}>Firma Digital</h2>
          <button
            onClick={() => { sigRef.current?.clear(); setSigEmpty(true) }}
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: '#9CA3AF' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>

        {existingSignature && sigEmpty && (
          <div className="mb-3 rounded-xl border p-3" style={{ borderColor: '#E8ECF0', backgroundColor: '#FAFBFC' }}>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Firma actual (se conserva si no firma de nuevo)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={existingSignature} alt="Firma actual" style={{ maxHeight: '80px' }} />
          </div>
        )}

        <div
          ref={sigWrapRef}
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: sigEmpty ? '#E8ECF0' : '#22C55E', height: SIG_HEIGHT }}
        >
          {sigWidth > 0 && (
            <SignatureCanvas
              ref={sigRef}
              penColor="#1C3557"
              canvasProps={{
                width: sigWidth,
                height: SIG_HEIGHT,
                className: 'sig-canvas',
                style: { backgroundColor: '#F5F7FA', touchAction: 'none', display: 'block' },
              }}
              onBegin={() => setSigEmpty(false)}
            />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Firme con su dedo o lápiz óptico</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !department}
        className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        style={{ backgroundColor: loading ? '#b85c14' : '#F47920' }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-white"></div>
            {editId ? 'Guardando cambios...' : 'Enviando reporte...'}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            {editId ? 'Guardar Cambios' : 'Enviar Reporte'}
          </>
        )}
      </button>

      {/* Save status dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h2 className="font-bold text-lg" style={{ color: '#1C3557' }}>¿Cómo guardar el reporte?</h2>
              <p className="text-sm text-gray-500 mt-1">Seleccione el estado con el que se guardará.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleSubmitWithStatus('ACTIVO')}
                className="w-full py-4 rounded-xl text-sm font-bold border-2 text-left px-5 transition-all"
                style={{ borderColor: '#F47920', backgroundColor: '#FFF7ED', color: '#F47920' }}
              >
                <div className="font-bold">Activo</div>
                <div className="text-xs font-normal mt-0.5" style={{ color: '#92400E' }}>El reporte queda abierto y puede editarse.</div>
              </button>
              <button
                onClick={() => handleSubmitWithStatus('COMPLETADO')}
                className="w-full py-4 rounded-xl text-sm font-bold border-2 text-left px-5 transition-all"
                style={{ borderColor: '#1C3557', backgroundColor: '#EEF2FF', color: '#1C3557' }}
              >
                <div className="font-bold">Completado</div>
                <div className="text-xs font-normal mt-0.5" style={{ color: '#4B5563' }}>El reporte queda cerrado y no se puede editar.</div>
              </button>
            </div>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#F5F7FA', color: '#6B7280' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <NewReportInner />
    </Suspense>
  )
}
