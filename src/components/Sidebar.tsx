'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { parseDepts, DEPT_LABELS, ALL_DEPARTMENTS } from '@/lib/departments'

interface SidebarProps {
  userRole: string
  userName: string
  userDepartment: string | null
  onClose?: () => void
}

const departmentLabels = DEPT_LABELS

export default function Sidebar({ userRole, userName, userDepartment, onClose }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Departamentos que el usuario puede usar: admin todos, otros los suyos (puede ser múltiples).
  const allowedDepartments =
    userRole === 'ADMIN'
      ? [...ALL_DEPARTMENTS]
      : parseDepts(userDepartment)

  const onNuevoReporte = pathname.startsWith('/nuevo-reporte')
  const [reporteOpen, setReporteOpen] = useState(onNuevoReporte)

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/reportes', label: 'Reportes', icon: FileText },
    ...(userRole === 'ADMIN' ? [{ href: '/admin', label: 'Administración', icon: Users }] : []),
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const currentDept = searchParams.get('dept')

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1C3557' }}>
      {/* Logo area */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/citymall-logo.png" alt="CityMall" className="h-9 w-auto" />
          </div>
          <div className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Reportes</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white p-1"
            style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            backgroundColor: isActive('/') ? 'rgba(244,121,32,0.2)' : 'transparent',
            color: isActive('/') ? '#F47920' : 'rgba(255,255,255,0.75)',
            borderLeft: isActive('/') ? '3px solid #F47920' : '3px solid transparent',
          }}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          Dashboard
        </Link>

        {/* Nuevo Reporte (desplegable por departamento) */}
        {allowedDepartments.length > 0 && (
          <div>
            <button
              onClick={() => setReporteOpen(o => !o)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: onNuevoReporte ? 'rgba(244,121,32,0.2)' : 'transparent',
                color: onNuevoReporte ? '#F47920' : 'rgba(255,255,255,0.75)',
                borderLeft: onNuevoReporte ? '3px solid #F47920' : '3px solid transparent',
              }}
            >
              <FilePlus className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">Nuevo Reporte</span>
              {reporteOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {reporteOpen && (
              <div className="mt-1 ml-3 pl-3 space-y-0.5 border-l" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                {allowedDepartments.map(dep => {
                  const active = onNuevoReporte && currentDept === dep
                  return (
                    <Link
                      key={dep}
                      href={`/nuevo-reporte?dept=${dep}`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all"
                      style={{
                        backgroundColor: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                        color: active ? 'white' : 'rgba(255,255,255,0.7)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {departmentLabels[dep] || dep}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Reportes + Administración */}
        {navItems.slice(1).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: isActive(href) ? 'rgba(244,121,32,0.2)' : 'transparent',
              color: isActive(href) ? '#F47920' : 'rgba(255,255,255,0.75)',
              borderLeft: isActive(href) ? '3px solid #F47920' : '3px solid transparent',
            }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User area */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: '#F47920' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{userName}</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {userRole === 'ADMIN'
                ? 'Administrador'
                : (() => {
                    const depts = parseDepts(userDepartment)
                    return depts.length > 0
                      ? depts.map(d => departmentLabels[d] || d).join(', ')
                      : 'Sin departamento'
                  })()}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'rgba(255,255,255,0.6)', backgroundColor: 'transparent' }}
          onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(214,68,64,0.2)'; (e.currentTarget as HTMLElement).style.color = '#D64440' }}
          onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
