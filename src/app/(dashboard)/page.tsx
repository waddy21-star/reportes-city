'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FilePlus, AlertTriangle, FileText, Building2, ChevronRight, Clock } from 'lucide-react'
import { DEPT_LABELS as departmentLabels, DEPT_COLORS as departmentColors, deptLabel } from '@/lib/departments'
import type { ReportSummary as Report } from '@/types'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    const dateFrom = format(today, 'yyyy-MM-dd')
    fetch(`/api/reports?dateFrom=${dateFrom}`)
      .then(r => r.json())
      .then(data => {
        setReports(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const todayReports = reports.length
  const urgentReports = reports.filter(r => r.level === 'URGENTE').length
  const recentReports = reports.slice(0, 5)

  const getHour = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1C3557 0%, #2a4d7a 100%)' }}>
        <p className="text-blue-200 text-sm font-medium">{getHour()},</p>
        <h2 className="text-2xl font-bold mt-1">{session?.user?.name?.split(' ')[0]}</h2>
        <p className="text-blue-200 text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
        {session?.user?.department && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mt-3"
            style={{ backgroundColor: 'rgba(244,121,32,0.25)', color: '#F47920', border: '1px solid rgba(244,121,32,0.4)' }}
          >
            <Building2 className="w-3 h-3" />
            {deptLabel(session.user.department)}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Reportes Hoy</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
              <FileText className="w-4.5 h-4.5" style={{ color: '#1C3557' }} />
            </div>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#1C3557' }}>{loading ? '—' : todayReports}</div>
          <p className="text-xs text-gray-400 mt-1">reportes registrados</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Urgentes</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
              <AlertTriangle className="w-4.5 h-4.5" style={{ color: '#D64440' }} />
            </div>
          </div>
          <div className="text-3xl font-bold" style={{ color: urgentReports > 0 ? '#D64440' : '#1C3557' }}>{loading ? '—' : urgentReports}</div>
          <p className="text-xs text-gray-400 mt-1">requieren atención</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Departamento</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFF7ED' }}>
              <Building2 className="w-4.5 h-4.5" style={{ color: '#F47920' }} />
            </div>
          </div>
          <div className="text-lg font-bold" style={{ color: '#1C3557' }}>
            {session?.user?.role === 'ADMIN' ? 'Admin' : session?.user?.department ? deptLabel(session.user.department) : 'N/A'}
          </div>
          <p className="text-xs text-gray-400 mt-1">área asignada</p>
        </div>
      </div>

      {/* Quick action */}
      <Link
        href="/nuevo-reporte"
        className="flex items-center gap-4 p-5 rounded-2xl text-white font-medium shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
        style={{ background: 'linear-gradient(135deg, #F47920, #e06510)' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <FilePlus className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-lg">Crear Nuevo Reporte</div>
          <div className="text-white/80 text-sm">Registrar actividades y novedades</div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/60" />
      </Link>

      {/* Recent reports */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#E8ECF0' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E8ECF0' }}>
          <h3 className="font-bold text-base" style={{ color: '#1C3557' }}>Reportes Recientes (Hoy)</h3>
          <Link href="/reportes" className="text-sm font-medium hover:underline" style={{ color: '#F47920' }}>Ver todos</Link>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }}></div>
            <p className="text-gray-400 text-sm">Cargando reportes...</p>
          </div>
        ) : recentReports.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No hay reportes hoy</p>
            <p className="text-gray-400 text-sm mt-1">Cree el primer reporte del día</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#F5F7FA' }}>
            {recentReports.map(report => {
              const incidents = report.reportTasks.filter(t => t.hasIncident).length
              return (
                <Link
                  key={report.id}
                  href={`/reportes/${report.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${departmentColors[report.department] || '#1C3557'}15` }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: departmentColors[report.department] || '#1C3557' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: '#1C3557' }}>
                        {departmentLabels[report.department] || report.department}
                      </span>
                      {report.level === 'URGENTE' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
                          URGENTE
                        </span>
                      )}
                      {incidents > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FFF7ED', color: '#F47920' }}>
                          {incidents} incidente{incidents > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(report.createdAt), 'HH:mm')} — {report.user.name}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
