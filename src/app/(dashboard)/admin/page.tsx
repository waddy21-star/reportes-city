'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit,
  X,
  ChevronRight,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { parseDepts, ALL_DEPARTMENTS, DEPT_LABELS } from '@/lib/departments'
import type { AdminUser as User, ReportSummary as Report, UserCreateInput, UserRole } from '@/types'

const departmentLabels = DEPT_LABELS

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [urgentReports, setUrgentReports] = useState<Report[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('USER')
  const [formDepts, setFormDepts] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchUsers()
    fetchUrgentReports()
  }, [session])

  const fetchUsers = () => {
    setLoadingUsers(true)
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoadingUsers(false) })
      .catch(() => setLoadingUsers(false))
  }

  const fetchUrgentReports = () => {
    fetch('/api/reports?level=URGENTE')
      .then(r => r.json())
      .then(data => setUrgentReports(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  const openCreateForm = () => {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('USER')
    setFormDepts([])
    setFormActive(true)
    setFormError('')
    setShowForm(true)
  }

  const openEditForm = (user: User) => {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword('')
    setFormRole(user.role)
    setFormDepts(parseDepts(user.department))
    setFormActive(user.active)
    setFormError('')
    setShowForm(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')

    try {
      const body: Partial<UserCreateInput> & { active: boolean } = {
        name: formName,
        email: formEmail,
        role: formRole as UserRole,
        departments: formRole === 'ADMIN' ? [] : formDepts,
        active: formActive,
      }
      if (formPassword) body.password = formPassword
      if (!editingUser) body.password = formPassword

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })
      fetchUsers()
    } catch {
      alert('Error al actualizar usuario')
    }
  }

  const activeUsers = users.filter(u => u.active)
  const inactiveUsers = users.filter(u => !u.active)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Urgent reports banner */}
      {urgentReports.length > 0 && (
        <div className="rounded-2xl p-5 border-2" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
          <h2 className="font-bold flex items-center gap-2 mb-3" style={{ color: '#D64440' }}>
            <AlertTriangle className="w-5 h-5" />
            Reportes Urgentes ({urgentReports.length})
          </h2>
          <div className="space-y-2">
            {urgentReports.slice(0, 5).map(report => (
              <Link
                key={report.id}
                href={`/reportes/${report.id}`}
                className="flex items-center gap-3 bg-white rounded-xl p-3 hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#D64440' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: '#1C3557' }}>
                    {departmentLabels[report.department] || report.department}
                  </p>
                  <p className="text-xs text-gray-400">
                    {report.user.name} — {format(new Date(report.createdAt), "d MMM, HH:mm", { locale: es })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))}
          </div>
          {urgentReports.length > 5 && (
            <Link href="/reportes?level=URGENTE" className="block text-center text-sm font-medium mt-3" style={{ color: '#D64440' }}>
              Ver todos los urgentes ({urgentReports.length})
            </Link>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border rounded-2xl overflow-hidden bg-white shadow-sm" style={{ borderColor: '#E8ECF0' }}>
        <button
          onClick={() => setActiveTab('users')}
          className="flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          style={{
            backgroundColor: activeTab === 'users' ? '#1C3557' : 'white',
            color: activeTab === 'users' ? 'white' : '#6B7280',
          }}
        >
          <Users className="w-4 h-4" />
          Usuarios ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className="flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          style={{
            backgroundColor: activeTab === 'reports' ? '#1C3557' : 'white',
            color: activeTab === 'reports' ? 'white' : '#6B7280',
          }}
        >
          <FileText className="w-4 h-4" />
          Reportes Urgentes
          {urgentReports.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#D64440', color: 'white' }}>
              {urgentReports.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* User management */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base" style={{ color: '#1C3557' }}>Gestión de Usuarios</h2>
            <button
              onClick={openCreateForm}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
              style={{ backgroundColor: '#F47920' }}
            >
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>

          {/* User form modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg" style={{ color: '#1C3557' }}>
                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#D64440' }}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1C3557' }}>Nombre completo *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1C3557' }}>Email *</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1C3557' }}>
                      Contraseña {editingUser ? '(dejar en blanco para no cambiar)' : '*'}
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      required={!editingUser}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1C3557' }}>Rol *</label>
                    <select
                      value={formRole}
                      onChange={e => setFormRole(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                    >
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>

                  {formRole === 'ADMIN' ? (
                    <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#FFF7ED', color: '#B45309' }}>
                      Los administradores tienen acceso a todos los departamentos.
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1C3557' }}>Departamentos</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_DEPARTMENTS.map(dep => {
                          const checked = formDepts.includes(dep)
                          return (
                            <label
                              key={dep}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all"
                              style={{
                                borderColor: checked ? '#1C3557' : '#E8ECF0',
                                backgroundColor: checked ? '#EEF2FF' : 'white',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setFormDepts(prev =>
                                    checked ? prev.filter(d => d !== dep) : [...prev, dep]
                                  )
                                }}
                                className="sr-only"
                              />
                              <div
                                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  borderColor: checked ? '#1C3557' : '#D1D5DB',
                                  backgroundColor: checked ? '#1C3557' : 'white',
                                }}
                              >
                                {checked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-xs font-medium" style={{ color: checked ? '#1C3557' : '#6B7280' }}>
                                {DEPT_LABELS[dep]}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {editingUser && (
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setFormActive(!formActive)}
                        className="w-12 h-6 rounded-full relative cursor-pointer transition-colors"
                        style={{ backgroundColor: formActive ? '#22C55E' : '#D1D5DB' }}
                      >
                        <div
                          className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow"
                          style={{ transform: formActive ? 'translateX(26px)' : 'translateX(2px)' }}
                        />
                      </div>
                      <label className="text-sm font-medium cursor-pointer" style={{ color: '#374151' }} onClick={() => setFormActive(!formActive)}>
                        {formActive ? 'Usuario activo' : 'Usuario inactivo'}
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: '#F47920' }}
                    >
                      {formLoading ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium"
                      style={{ backgroundColor: '#F5F7FA', color: '#6B7280' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users list */}
          {loadingUsers ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
              <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#F47920', borderTopColor: 'transparent' }}></div>
              <p className="text-gray-400 text-sm">Cargando usuarios...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active users */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#E8ECF0' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: '#F5F7FA' }}>
                  <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: '#22C55E' }}>
                    <CheckCircle2 className="w-4 h-4" />
                    Usuarios Activos ({activeUsers.length})
                  </h3>
                </div>
                {activeUsers.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400 text-center">No hay usuarios activos</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#F5F7FA' }}>
                    {activeUsers.map(user => (
                      <UserRow key={user.id} user={user} onEdit={openEditForm} onToggle={handleToggleActive} />
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive users */}
              {inactiveUsers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#E8ECF0' }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: '#F5F7FA' }}>
                    <h3 className="font-bold text-sm flex items-center gap-2 text-gray-400">
                      <XCircle className="w-4 h-4" />
                      Usuarios Inactivos ({inactiveUsers.length})
                    </h3>
                  </div>
                  <div className="divide-y" style={{ borderColor: '#F5F7FA' }}>
                    {inactiveUsers.map(user => (
                      <UserRow key={user.id} user={user} onEdit={openEditForm} onToggle={handleToggleActive} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-3">
          <h2 className="font-bold text-base" style={{ color: '#1C3557' }}>Todos los Reportes Urgentes</h2>
          {urgentReports.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border" style={{ borderColor: '#E8ECF0' }}>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#22C55E' }} />
              <p className="font-medium text-gray-500">No hay reportes urgentes</p>
              <p className="text-sm text-gray-400 mt-1">Todo en orden</p>
            </div>
          ) : (
            urgentReports.map(report => (
              <Link
                key={report.id}
                href={`/reportes/${report.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border-2 hover:shadow-md transition-shadow"
                style={{ borderColor: '#D64440' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEF2F2' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: '#D64440' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: '#1C3557' }}>
                      {departmentLabels[report.department] || report.department}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#D64440', color: 'white' }}>URGENTE</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {report.user.name} — {format(new Date(report.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, onEdit, onToggle }: { user: User; onEdit: (u: User) => void; onToggle: (u: User) => void }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4" style={{ opacity: user.active ? 1 : 0.6 }}>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: user.active ? '#1C3557' : '#9CA3AF' }}
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm" style={{ color: '#1C3557' }}>{user.name}</span>
          {user.role === 'ADMIN' && (
            <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#FFF7ED', color: '#F47920' }}>Admin</span>
          )}
          {parseDepts(user.department).map(dep => (
            <span key={dep} className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#EEF2FF', color: '#1C3557' }}>
              {departmentLabels[dep] || dep}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{user.email} · {user._count.reports} reporte{user._count.reports !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onToggle(user)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: user.active ? '#FEF2F2' : '#F0FDF4',
            color: user.active ? '#D64440' : '#16A34A',
          }}
        >
          {user.active ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={() => onEdit(user)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: '#6B7280' }}
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
