'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Search,
  Filter,
  AlertTriangle,
  ChevronRight,
  Building2,
  Clock,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { DEPT_LABELS as departmentLabels, DEPT_COLORS as departmentColors, ALL_DEPARTMENTS } from '@/lib/departments'

interface Report {
  id: string
  department: string
  level: string
  status: string
  notes: string | null
  createdAt: string
  user: { id: string; name: string; department: string | null }
  reportTasks: { id: string; hasIncident: boolean }[]
  photos: { id: string }[]
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchReports = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterDept) params.set('department', filterDept)
    if (filterLevel) params.set('level', filterLevel)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (search) params.set('keyword', search)

    fetch(`/api/reports?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setReports(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports()
  }, [filterDept, filterLevel, dateFrom, dateTo])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReports()
  }

  const clearFilters = () => {
    setSearch('')
    setFilterDept('')
    setFilterLevel('')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = search || filterDept || filterLevel || dateFrom || dateTo

  const urgentReports = reports.filter(r => r.level === 'URGENTE')
  const normalReports = reports.filter(r => r.level !== 'URGENTE')

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en notas..."
              className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none"
              style={{ borderColor: '#E8ECF0', color: '#374151' }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: '#E8ECF0', color: filterDept ? '#1C3557' : '#9CA3AF' }}
            >
              <option value="">Todos los depts.</option>
              {ALL_DEPARTMENTS.map(dep => (
                <option key={dep} value={dep}>{departmentLabels[dep]}</option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: '#E8ECF0', color: filterLevel ? '#1C3557' : '#9CA3AF' }}
            >
              <option value="">Todos los niveles</option>
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: '#E8ECF0', color: dateFrom ? '#1C3557' : '#9CA3AF' }}
              placeholder="Desde"
            />

            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: '#E8ECF0', color: dateTo ? '#1C3557' : '#9CA3AF' }}
              placeholder="Hasta"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#F47920' }}
            >
              Buscar
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1"
                style={{ backgroundColor: '#F5F7FA', color: '#6B7280' }}
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? 'Cargando...' : `${reports.length} reporte${reports.length !== 1 ? 's' : ''} encontrado${reports.length !== 1 ? 's' : ''}`}
        </p>
        {urgentReports.length > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {urgentReports.length} urgente{urgentReports.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-400 text-sm">Cargando reportes...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <FileText className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No se encontraron reportes</p>
          <p className="text-sm text-gray-400 mt-1">Intente con diferentes filtros</p>
        </div>
      ) : (
        <>
          {/* Urgent reports */}
          {urgentReports.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#D64440' }}>
                <AlertTriangle className="w-4 h-4" />
                Reportes Urgentes
              </h3>
              {urgentReports.map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}

          {/* Normal reports */}
          {normalReports.length > 0 && (
            <div className="space-y-3">
              {urgentReports.length > 0 && (
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Reportes Normales</h3>
              )}
              {normalReports.map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReportCard({ report }: { report: Report }) {
  const incidents = report.reportTasks.filter(t => t.hasIncident).length

  return (
    <Link
      href={`/reportes/${report.id}`}
      className="block bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all"
      style={{
        borderColor: report.level === 'URGENTE' ? '#D64440' : '#E8ECF0',
        borderWidth: report.level === 'URGENTE' ? '2px' : '1px',
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${departmentColors[report.department] || '#1C3557'}18` }}
          >
            <Building2 className="w-6 h-6" style={{ color: departmentColors[report.department] || '#1C3557' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-sm" style={{ color: '#1C3557' }}>
                {departmentLabels[report.department] || report.department}
              </span>
              {report.level === 'URGENTE' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1" style={{ backgroundColor: '#D64440', color: 'white' }}>
                  <AlertTriangle className="w-3 h-3" />
                  URGENTE
                </span>
              )}
              {report.level === 'NORMAL' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                  Normal
                </span>
              )}
              {report.status === 'COMPLETADO' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#EEF2FF', color: '#1C3557' }}>
                  Completado
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#FFF7ED', color: '#F47920' }}>
                  Activo
                </span>
              )}
              {incidents > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
                  {incidents} incidente{incidents > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(report.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
              </span>
              <span>{report.user.name}</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {report.reportTasks.length} tarea{report.reportTasks.length !== 1 ? 's' : ''}
              </span>
              {report.photos.length > 0 && (
                <span>{report.photos.length} foto{report.photos.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {report.notes && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{report.notes}</p>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 self-center" />
        </div>
      </div>
    </Link>
  )
}
