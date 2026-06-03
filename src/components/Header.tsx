'use client'

import { Menu, Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b px-4 lg:px-6 py-4 flex items-center gap-4" style={{ borderColor: '#E8ECF0' }}>
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" style={{ color: '#1C3557' }} />
      </button>
      <h1 className="text-xl font-bold flex-1" style={{ color: '#1C3557' }}>{title}</h1>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-xs font-medium text-gray-500 hidden sm:block">En línea</span>
      </div>
    </header>
  )
}
