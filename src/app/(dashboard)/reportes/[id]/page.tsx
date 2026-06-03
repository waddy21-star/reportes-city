'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Building2,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Camera,
  PenLine,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Thermometer,
  Wind,
} from 'lucide-react'
import Link from 'next/link'

const departmentLabels: Record<string, string> = {
  SEGURIDAD: 'Seguridad',
  ELECTRICO: 'Eléctrico',
  CIVIL: 'Civil',
  REFRIGERACION: 'Refrigeración',
}

const departmentColors: Record<string, string> = {
  SEGURIDAD: '#1C3557',
  ELECTRICO: '#F47920',
  CIVIL: '#22C55E',
  REFRIGERACION: '#8B5CF6',
}

const AC_TYPE_LABELS: Record<string, string> = {
  MINI_SPLIT: 'Mini Split',
  PISO_CIELO: 'Piso Cielo',
  CASSETTE: 'Cassette',
  CENTRAL_DUCTOS: 'Central de Ductos',
  CHILLER: 'Chiller',
}

const LOCATION_LABELS: Record<string, string> = {
  NIVEL_1: 'Nivel 1',
  NIVEL_2: 'Nivel 2',
  NIVEL_3: 'Nivel 3',
  SOTANO_1: 'Sótano 1',
  SOTANO_2: 'Sótano 2',
  SOTANO_3: 'Sótano 3',
}

interface ChecklistItem {
  id: string
  label: string
  checked: boolean
  checklistItem: { label: string }
}

interface ReportTask {
  id: string
  hasIncident: boolean
  incidentNote: string | null
  task: { id: string; name: string; timeSlot: string | null }
  checkItems: ChecklistItem[]
}

interface LocalMaintenanceRecord {
  id: string
  localName: string
  acType: string
  location: string
  items: string // JSON string
  hasIssue: boolean
  issueNote: string | null
  createdAt: string
}

interface Report {
  id: string
  userId: string
  department: string
  level: string
  status: string
  notes: string | null
  signature: string | null
  createdAt: string
  user: { id: string; name: string; department: string | null }
  reportTasks: ReportTask[]
  photos: { id: string; path: string; filename: string }[]
  localRecords?: LocalMaintenanceRecord[]
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [escalating, setEscalating] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})
  const [expandedLocals, setExpandedLocals] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`/api/reports/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setReport(data)
        // Expand tasks with incidents by default
        const expanded: Record<string, boolean> = {}
        data.reportTasks?.forEach((t: ReportTask) => {
          if (t.hasIncident) expanded[t.id] = true
        })
        setExpandedTasks(expanded)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleEscalate = async () => {
    if (!report || report.level === 'URGENTE') return
    setEscalating(true)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'URGENTE' }),
      })
      const updated = await res.json()
      setReport(updated)
    } catch {
      alert('Error al escalar el reporte')
    } finally {
      setEscalating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-400 text-sm">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 font-medium">Reporte no encontrado</p>
        <Link href="/reportes" className="text-sm mt-2 inline-block" style={{ color: '#F47920' }}>
          Volver a reportes
        </Link>
      </div>
    )
  }

  const incidents = report.reportTasks.filter(t => t.hasIncident)
  const mallTasks = report.reportTasks.filter(t => t.task.timeSlot === 'MALL')
  const nonMallTasks = report.reportTasks.filter(t => t.task.timeSlot !== 'MALL')
  const isRefrig = report.department === 'REFRIGERACION'
  const localRecords = report.localRecords || []

  const localIssues = localRecords.filter(r => r.hasIssue)

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Back */}
      <Link
        href="/reportes"
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        style={{ color: '#6B7280' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a reportes
      </Link>

      {/* Header */}
      <div
        className="bg-white rounded-2xl p-6 shadow-sm border"
        style={{ borderColor: report.level === 'URGENTE' ? '#D64440' : '#E8ECF0', borderWidth: report.level === 'URGENTE' ? '2px' : '1px' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${departmentColors[report.department] || '#1C3557'}18` }}
            >
              <Building2 className="w-7 h-7" style={{ color: departmentColors[report.department] || '#1C3557' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold" style={{ color: '#1C3557' }}>
                  Reporte — {departmentLabels[report.department] || report.department}
                </h1>
                {report.level === 'URGENTE' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1" style={{ backgroundColor: '#D64440', color: 'white' }}>
                    <AlertTriangle className="w-3 h-3" />
                    URGENTE
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                    Normal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(report.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {report.user.name}
                </span>
              </div>
            </div>
          </div>

          {session?.user?.role === 'ADMIN' && report.level !== 'URGENTE' && (
            <button
              onClick={handleEscalate}
              disabled={escalating}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}
            >
              <TrendingUp className="w-4 h-4" />
              {escalating ? 'Escalando...' : 'Marcar Urgente'}
            </button>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t" style={{ borderColor: '#F5F7FA' }}>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: '#1C3557' }}>{report.reportTasks.length}</div>
            <div className="text-xs text-gray-400">Tareas</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: (incidents.length + localIssues.length) > 0 ? '#D64440' : '#22C55E' }}>
              {incidents.length + localIssues.length}
            </div>
            <div className="text-xs text-gray-400">Incidentes</div>
          </div>
          <div className="text-center">
            {isRefrig ? (
              <>
                <div className="text-xl font-bold" style={{ color: '#8B5CF6' }}>{localRecords.length}</div>
                <div className="text-xs text-gray-400">Locales</div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold" style={{ color: '#F47920' }}>{report.photos.length}</div>
                <div className="text-xs text-gray-400">Fotos</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Incidents summary */}
      {(incidents.length > 0 || localIssues.length > 0) && (
        <div className="rounded-2xl p-5 border-2" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
          <h2 className="font-bold text-sm flex items-center gap-2 mb-3" style={{ color: '#D64440' }}>
            <AlertTriangle className="w-4 h-4" />
            Incidentes Reportados ({incidents.length + localIssues.length})
          </h2>
          <div className="space-y-2">
            {incidents.map(task => (
              <div key={task.id} className="bg-white rounded-xl p-3">
                <p className="font-semibold text-sm" style={{ color: '#1C3557' }}>{task.task.name}</p>
                {task.incidentNote && (
                  <p className="text-sm text-gray-600 mt-1">{task.incidentNote}</p>
                )}
              </div>
            ))}
            {localIssues.map(rec => (
              <div key={rec.id} className="bg-white rounded-xl p-3">
                <p className="font-semibold text-sm flex items-center gap-2" style={{ color: '#1C3557' }}>
                  <Thermometer className="w-3.5 h-3.5" style={{ color: '#8B5CF6' }} />
                  {rec.localName}
                </p>
                {rec.issueNote && (
                  <p className="text-sm text-gray-600 mt-1">{rec.issueNote}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refrigeración: Mall Tasks */}
      {isRefrig && mallTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2" style={{ color: '#1C3557' }}>
            <Wind className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            Tareas Mall
          </h2>
          {mallTasks.map(task => {
            const checkedCount = task.checkItems.filter(i => i.checked).length
            const totalItems = task.checkItems.length
            const expanded = expandedTasks[task.id]

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                style={{
                  borderColor: task.hasIncident ? '#D64440' : '#E8ECF0',
                  borderWidth: task.hasIncident ? '2px' : '1px',
                }}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-semibold text-sm" style={{ color: '#1C3557' }}>{task.task.name}</span>
                      {task.hasIncident && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#D64440', color: 'white' }}>
                          Incidente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {totalItems > 0 && (
                        <span className="text-xs text-gray-400">{checkedCount}/{totalItems}</span>
                      )}
                      {(totalItems > 0 || task.hasIncident) && (
                        <button
                          onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                          style={{ color: '#9CA3AF' }}
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#F5F7FA', backgroundColor: '#FAFBFC' }}>
                    {task.checkItems.length > 0 && (
                      <div className="space-y-2">
                        {task.checkItems.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            {item.checked ? (
                              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
                            ) : (
                              <XCircle className="w-5 h-5 flex-shrink-0 text-gray-300" />
                            )}
                            <span className="text-sm" style={{ color: item.checked ? '#374151' : '#9CA3AF', textDecoration: item.checked ? 'none' : 'line-through' }}>
                              {item.checklistItem.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {task.hasIncident && task.incidentNote && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#D64440' }}>Nota del incidente:</p>
                        <p className="text-sm text-gray-700">{task.incidentNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Refrigeración: Local Maintenance Records */}
      {isRefrig && localRecords.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2" style={{ color: '#1C3557' }}>
            <Thermometer className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            Mantenimiento de Locales ({localRecords.length})
          </h2>
          {localRecords.map(rec => {
            let parsedItems: { id: number; label: string; checked: boolean }[] = []
            try { parsedItems = JSON.parse(rec.items) } catch {}
            const checkedCount = parsedItems.filter(i => i.checked).length
            const expanded = expandedLocals[rec.id]

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl shadow-sm border-2 overflow-hidden"
                style={{ borderColor: rec.hasIssue ? '#D64440' : '#8B5CF620' }}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base" style={{ color: '#1C3557' }}>{rec.localName}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
                          {AC_TYPE_LABELS[rec.acType] || rec.acType}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#EEF2FF', color: '#1C3557' }}>
                          {LOCATION_LABELS[rec.location] || rec.location}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                          {checkedCount}/{parsedItems.length} ítems
                        </span>
                        {rec.hasIssue && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
                            <AlertTriangle className="w-3 h-3" />
                            Problema
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedLocals(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
                      style={{ color: '#9CA3AF' }}
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#F5F7FA', backgroundColor: '#FAFBFC' }}>
                    {parsedItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lista de verificación</p>
                        {parsedItems.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            {item.checked ? (
                              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
                            ) : (
                              <XCircle className="w-5 h-5 flex-shrink-0 text-gray-300" />
                            )}
                            <span className="text-sm" style={{ color: item.checked ? '#374151' : '#9CA3AF', textDecoration: item.checked ? 'none' : 'line-through' }}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {rec.hasIssue && rec.issueNote && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#D64440' }}>Nota del problema:</p>
                        <p className="text-sm text-gray-700">{rec.issueNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Non-refrigeración tasks OR refrigeración fallback */}
      {!isRefrig && (
        <div className="space-y-3">
          <h2 className="font-bold text-base" style={{ color: '#1C3557' }}>Tareas Ejecutadas</h2>
          {report.reportTasks.map(task => {
            const checkedCount = task.checkItems.filter(i => i.checked).length
            const totalItems = task.checkItems.length
            const expanded = expandedTasks[task.id]

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                style={{
                  borderColor: task.hasIncident ? '#D64440' : '#E8ECF0',
                  borderWidth: task.hasIncident ? '2px' : '1px',
                }}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {task.task.timeSlot && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono" style={{ backgroundColor: '#EEF2FF', color: '#1C3557' }}>
                          {task.task.timeSlot}
                        </span>
                      )}
                      <span className="font-semibold text-sm" style={{ color: '#1C3557' }}>{task.task.name}</span>
                      {task.hasIncident && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#D64440', color: 'white' }}>
                          Incidente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {totalItems > 0 && (
                        <span className="text-xs text-gray-400">{checkedCount}/{totalItems}</span>
                      )}
                      {(totalItems > 0 || task.hasIncident) && (
                        <button
                          onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                          style={{ color: '#9CA3AF' }}
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#F5F7FA', backgroundColor: '#FAFBFC' }}>
                    {task.checkItems.length > 0 && (
                      <div className="space-y-2">
                        {task.checkItems.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            {item.checked ? (
                              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
                            ) : (
                              <XCircle className="w-5 h-5 flex-shrink-0 text-gray-300" />
                            )}
                            <span
                              className="text-sm"
                              style={{ color: item.checked ? '#374151' : '#9CA3AF', textDecoration: item.checked ? 'none' : 'line-through' }}
                            >
                              {item.checklistItem.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {task.hasIncident && task.incidentNote && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#D64440' }}>Nota del incidente:</p>
                        <p className="text-sm text-gray-700">{task.incidentNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Notes */}
      {report.notes && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <h2 className="font-bold text-base mb-3" style={{ color: '#1C3557' }}>Notas Generales</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{report.notes}</p>
        </div>
      )}

      {/* Photos */}
      {report.photos.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <h2 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: '#1C3557' }}>
            <Camera className="w-5 h-5" style={{ color: '#F47920' }} />
            Fotografías ({report.photos.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {report.photos.map(photo => (
              <a key={photo.id} href={photo.path} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden">
                <img
                  src={photo.path}
                  alt={photo.filename}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Signature */}
      {report.signature && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <h2 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: '#1C3557' }}>
            <PenLine className="w-5 h-5" style={{ color: '#F47920' }} />
            Firma Digital
          </h2>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E8ECF0' }}>
            <img
              src={report.signature}
              alt="Firma digital"
              className="w-full"
              style={{ backgroundColor: '#F5F7FA', maxHeight: '200px', objectFit: 'contain' }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Firmado por {report.user.name}</p>
        </div>
      )}
    </div>
  )
}
