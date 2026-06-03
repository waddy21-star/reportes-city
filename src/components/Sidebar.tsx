'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  LogOut,
  X,
} from 'lucide-react'

interface SidebarProps {
  userRole: string
  userName: string
  userDepartment: string | null
  onClose?: () => void
}

const departmentColors: Record<string, string> = {
  SEGURIDAD: '#1C3557',
  ELECTRICO: '#F47920',
  CIVIL: '#22C55E',
  REFRIGERACION: '#8B5CF6',
}

const departmentLabels: Record<string, string> = {
  SEGURIDAD: 'Seguridad',
  ELECTRICO: 'Eléctrico',
  CIVIL: 'Civil',
  REFRIGERACION: 'Refrigeración',
}

export default function Sidebar({ userRole, userName, userDepartment, onClose }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/nuevo-reporte', label: 'Nuevo Reporte', icon: FilePlus },
    { href: '/reportes', label: 'Reportes', icon: FileText },
    ...(userRole === 'ADMIN' ? [{ href: '/admin', label: 'Administración', icon: Users }] : []),
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1C3557' }}>
      {/* Logo area */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image src="/citymall-logo.svg" alt="CityMall" width={40} height={48} className="flex-shrink-0" />
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
        {navItems.map(({ href, label, icon: Icon }) => (
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
            onMouseOver={(e) => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.color = 'white'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive(href)) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
              }
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
            style={{ backgroundColor: userDepartment ? departmentColors[userDepartment] || '#F47920' : '#F47920' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{userName}</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {userRole === 'ADMIN' ? 'Administrador' : userDepartment ? departmentLabels[userDepartment] || userDepartment : 'Sin departamento'}
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
