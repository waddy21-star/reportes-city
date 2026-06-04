'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import SessionProvider from '@/components/SessionProvider'
import OfflineSync from '@/components/OfflineSync'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/nuevo-reporte': 'Nuevo Reporte',
  '/reportes': 'Reportes',
  '/admin': 'Administración',
  '/': 'Dashboard',
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()

  const title = Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] || 'Reportes CityMall'

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F7FA' }}>
        <div className="text-center">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#F47920', borderTopColor: 'transparent' }}
          ></div>
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className="fixed inset-y-0 left-0 z-30 w-64 lg:hidden transition-transform duration-300 ease-in-out"
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <Sidebar
          userRole={session.user.role}
          userName={session.user.name || ''}
          userDepartment={session.user.department}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Sidebar
          userRole={session.user.role}
          userName={session.user.name || ''}
          userDepartment={session.user.department}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Sincronización de reportes guardados offline */}
      <OfflineSync />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  )
}
