// Tipos de dominio compartidos por el frontend y las rutas API.
//
// Modelos de "vista" = la forma de los datos que devuelven las APIs (con sus
// includes de Prisma). Se centralizan aquí para no redefinir las mismas
// interfaces en cada página.

// ----- Enumeraciones (se guardan como String en SQLite) -----
export type UserRole = 'ADMIN' | 'USER'
export type ReportLevel = 'NORMAL' | 'URGENTE'
export type ReportStatus = 'ACTIVO' | 'COMPLETADO'

// ----- Catálogo de tareas -----
export interface ChecklistItem {
  id: string
  label: string
  order: number
}

export interface Task {
  id: string
  name: string
  department: string
  timeSlot: string | null
  isCustom: boolean
  checkItems: ChecklistItem[]
}

// ----- Referencias reutilizables -----
export interface ReportUser {
  id: string
  name: string
  department: string | null
}

export interface PhotoRef {
  id: string
  path: string
  filename: string
}

// ----- Detalle de un reporte (GET /api/reports/[id]) -----
export interface ReportTaskCheckItem {
  id: string
  checklistItemId: string
  checked: boolean
  checklistItem: { label: string }
}

export interface ReportTaskDetail {
  id: string
  taskId: string
  hasIncident: boolean
  incidentNote: string | null
  task: { id: string; name: string; timeSlot: string | null }
  checkItems: ReportTaskCheckItem[]
}

export interface LocalRecordRow {
  id: string
  localName: string
  acType: string
  location: string
  items: string // JSON: { id, label, checked, value? }[]
  hasIssue: boolean
  issueNote: string | null
  createdAt: string
}

export interface ReportDetail {
  id: string
  userId: string
  department: string
  level: ReportLevel
  status: ReportStatus
  notes: string | null
  signature: string | null
  createdAt: string
  user: ReportUser
  reportTasks: ReportTaskDetail[]
  photos: PhotoRef[]
  localRecords?: LocalRecordRow[]
}

// ----- Listado de reportes (GET /api/reports) -----
export interface ReportListItem {
  id: string
  department: string
  level: string
  status: string
  notes: string | null
  createdAt: string
  user: ReportUser
  reportTasks: { id: string; hasIncident: boolean }[]
  photos: { id: string }[]
}

// ----- Resumen (dashboard / panel de admin) -----
export interface ReportSummary {
  id: string
  department: string
  level: string
  status?: string
  createdAt: string
  user: { name: string }
  reportTasks: { hasIncident: boolean }[]
}

// ----- Usuario en el panel de administración (GET /api/users) -----
export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  active: boolean
  createdAt: string
  _count: { reports: number }
}

// ----- DTOs de las peticiones (cuerpos POST/PATCH) -----
export interface ReportTaskInput {
  taskId: string
  hasIncident: boolean
  incidentNote: string | null
  checkItems: { checklistItemId: string; checked: boolean }[]
}

export interface LocalRecordInput {
  localName: string
  acType: string
  location: string
  items: { id: number; label: string; checked: boolean; value?: string }[]
  hasIssue: boolean
  issueNote?: string
}

export interface ReportCreateInput {
  department: string
  level: ReportLevel
  status: ReportStatus
  notes: string | null
  signature: string | null
  tasks: ReportTaskInput[]
  localRecords: LocalRecordInput[]
}

export interface UserCreateInput {
  name: string
  email: string
  password: string
  role?: UserRole
  department?: string | null
  departments?: string[]
}

export interface UserUpdateInput {
  name?: string
  email?: string
  password?: string
  role?: UserRole
  department?: string | null
  departments?: string[]
  active?: boolean
}

export interface ReportUpdateInput {
  // Acción ligera: cambiar solo nivel y/o estado.
  level?: ReportLevel
  status?: ReportStatus
  // Edición completa (fullEdit: true): reemplaza tareas, locales y fotos.
  fullEdit?: boolean
  notes?: string | null
  signature?: string | null
  tasks?: ReportTaskInput[]
  localRecords?: LocalRecordInput[]
  removePhotoIds?: string[]
}
