export const ALL_DEPARTMENTS = ['SEGURIDAD', 'ELECTRICO', 'CIVIL', 'REFRIGERACION'] as const

export const DEPT_LABELS: Record<string, string> = {
  SEGURIDAD: 'Seguridad',
  ELECTRICO: 'Eléctrico',
  CIVIL: 'Civil',
  REFRIGERACION: 'Refrigeración',
}

export function parseDepts(dept: string | null | undefined): string[] {
  if (!dept) return []
  if (dept.startsWith('[')) {
    try { return JSON.parse(dept) } catch { return [] }
  }
  return [dept]
}

export function serializeDepts(depts: string[]): string | null {
  if (depts.length === 0) return null
  if (depts.length === 1) return depts[0]
  return JSON.stringify(depts)
}
