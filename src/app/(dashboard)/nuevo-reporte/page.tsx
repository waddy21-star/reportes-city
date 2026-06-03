'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

const departmentLabels: Record<string, string> = {
  SEGURIDAD: 'Seguridad',
  ELECTRICO: 'Eléctrico',
  CIVIL: 'Civil',
  REFRIGERACION: 'Refrigeración',
}

const AC_TYPES = [
  { value: 'MINI_SPLIT', label: 'Mini Split' },
  { value: 'PISO_CIELO', label: 'Piso Cielo' },
  { value: 'CASSETTE', label: 'Cassette' },
  { value: 'CENTRAL_DUCTOS', label: 'Central de Ductos' },
  { value: 'CHILLER', label: 'Chiller' },
]

const LOCATIONS = [
  { value: 'NIVEL_1', label: 'Nivel 1' },
  { value: 'NIVEL_2', label: 'Nivel 2' },
  { value: 'NIVEL_3', label: 'Nivel 3' },
  { value: 'SOTANO_1', label: 'Sótano 1' },
  { value: 'SOTANO_2', label: 'Sótano 2' },
  { value: 'SOTANO_3', label: 'Sótano 3' },
]

const LOCAL_CHECKLIST_ITEMS = [
  { id: 1, label: 'Lavado de evaporador y condensador' },
  { id: 2, label: 'Limpieza de drenaje y de bandeja' },
  { id: 3, label: 'Revisión de insulación de tubería' },
  { id: 4, label: 'Limpieza de difusores' },
  { id: 5, label: 'Tomar amperaje y voltaje de compresor' },
  { id: 6, label: 'Limpieza contacto de mando' },
  { id: 7, label: 'Limpieza de blower' },
  { id: 8, label: 'Tomar amperajes y voltaje de motor fan' },
  { id: 9, label: 'Revisión estado de ductos de descarga' },
  { id: 10, label: 'Presiones de refrigerante' },
  { id: 11, label: 'Carga de refrigerante si necesita' },
  { id: 12, label: 'Soportería de evaporador y condensador' },
  { id: 13, label: 'Set de termostato' },
]

interface ChecklistItem {
  id: string
  label: string
  order: number
}

interface Task {
  id: string
  name: string
  department: string
  timeSlot: string | null
  isCustom: boolean
  checkItems: ChecklistItem[]
}

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
  items: { id: number; label: string; checked: boolean }[]
  hasIssue: boolean
  issueNote: string
}

interface LocalFormState {
  localName: string
  acType: string
  location: string
  checkedItems: Record<number, boolean>
  hasIssue: boolean
  issueNote: string
}

const emptyLocalForm = (): LocalFormState => ({
  localName: '',
  acType: 'MINI_SPLIT',
  location: 'NIVEL_1',
  checkedItems: {},
  hasIssue: false,
  issueNote: '',
})

export default function NewReportPage() {
  const { data: session } = useSession()
  const router = useRouter()
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

  const departments = session?.user?.role === 'ADMIN'
    ? ['SEGURIDAD', 'ELECTRICO', 'CIVIL', 'REFRIGERACION']
    : session?.user?.department ? [session.user.department] : []

  useEffect(() => {
    if (departments.length === 1) {
      setDepartment(departments[0])
    }
  }, [session])

  useEffect(() => {
    if (!department) return
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
        setTaskStates(states)
        setLoadingTasks(false)
      })
      .catch(() => setLoadingTasks(false))
  }, [department])

  const mallTasks = tasks.filter(t => t.timeSlot === 'MALL')
  const nonMallTasks = tasks.filter(t => t.timeSlot !== 'MALL')
  const displayTasks = department === 'REFRIGERACION' ? mallTasks : nonMallTasks

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

  const handleSubmit = async () => {
    if (!department) {
      alert('Seleccione un departamento')
      return
    }

    setLoading(true)

    try {
      // Build report tasks (for Refrigeración, only mall tasks)
      const tasksToSubmit = department === 'REFRIGERACION' ? mallTasks : nonMallTasks
      const reportTasks = tasksToSubmit.map(task => {
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

      // Get signature
      let signature: string | null = null
      if (sigRef.current && !sigRef.current.isEmpty()) {
        signature = sigRef.current.toDataURL('image/png')
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          level,
          notes,
          signature,
          tasks: reportTasks,
          localRecords: department === 'REFRIGERACION' ? localRecords : [],
        }),
      })

      if (!res.ok) throw new Error('Error creating report')
      const report = await res.json()

      // Upload photos
      for (const photo of photos) {
        const fd = new FormData()
        fd.append('file', photo.file)
        fd.append('reportId', report.id)
        await fetch('/api/upload', { method: 'POST', body: fd })
      }

      router.push(`/reportes/${report.id}`)
    } catch {
      alert('Error al crear el reporte. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const hasIncidents = Object.values(taskStates).some(s => s.hasIncident)

  const acTypeLabel = (value: string) => AC_TYPES.find(t => t.value === value)?.label || value
  const locationLabel = (value: string) => LOCATIONS.find(l => l.value === value)?.label || value

  const renderTaskList = (taskList: Task[]) => (
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
                      {task.timeSlot && task.timeSlot !== 'MALL' && (
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
                  {task.checkItems.length > 0 && (
                    <div className="space-y-2">
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

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Department selector */}
      {departments.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <h2 className="font-bold text-base mb-3" style={{ color: '#1C3557' }}>Departamento</h2>
          <div className="grid grid-cols-2 gap-2">
            {departments.map(dep => (
              <button
                key={dep}
                onClick={() => setDepartment(dep)}
                className="py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all"
                style={{
                  borderColor: department === dep ? '#F47920' : '#E8ECF0',
                  backgroundColor: department === dep ? '#FFF7ED' : 'white',
                  color: department === dep ? '#F47920' : '#6B7280',
                }}
              >
                {departmentLabels[dep]}
              </button>
            ))}
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
                            <button
                              key={item.id}
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
                      No hay locales agregados. Presione "Agregar Local" para comenzar.
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

              {renderTaskList(nonMallTasks)}

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
        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: sigEmpty ? '#E8ECF0' : '#22C55E' }}
        >
          <SignatureCanvas
            ref={sigRef}
            penColor="#1C3557"
            canvasProps={{
              width: 600,
              height: 160,
              className: 'w-full sig-canvas',
              style: { backgroundColor: '#F5F7FA', touchAction: 'none' },
            }}
            onBegin={() => setSigEmpty(false)}
          />
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
            Enviando reporte...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Enviar Reporte
          </>
        )}
      </button>
    </div>
  )
}
