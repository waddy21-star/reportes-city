export const ALL_DEPARTMENTS = ['SEGURIDAD', 'ELECTRICO', 'CIVIL', 'REFRIGERACION', 'PARKING_SPORT'] as const

export const DEPT_LABELS: Record<string, string> = {
  SEGURIDAD: 'Seguridad',
  ELECTRICO: 'Eléctrico',
  CIVIL: 'Civil',
  REFRIGERACION: 'Refrigeración',
  PARKING_SPORT: 'Parking Sport',
}

export const DEPT_COLORS: Record<string, string> = {
  SEGURIDAD: '#1C3557',
  ELECTRICO: '#F47920',
  CIVIL: '#22C55E',
  REFRIGERACION: '#8B5CF6',
  PARKING_SPORT: '#0EA5E9',
}

// Etiqueta legible de uno o varios departamentos (acepta el string crudo,
// que puede ser un código simple o un JSON array de varios departamentos).
export function deptLabel(dept: string | null | undefined): string {
  const depts = parseDepts(dept)
  if (depts.length === 0) return 'Sin departamento'
  return depts.map((d) => DEPT_LABELS[d] || d).join(', ')
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
