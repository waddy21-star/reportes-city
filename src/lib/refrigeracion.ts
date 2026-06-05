// Constantes de dominio del departamento de Refrigeración: tipos de equipo de
// aire acondicionado, ubicaciones y la lista de verificación por local.
// Centralizadas aquí para no duplicarlas entre el formulario, el detalle del
// reporte y el PDF.

export const AC_TYPES = [
  { value: 'MINI_SPLIT', label: 'Mini Split' },
  { value: 'PISO_CIELO', label: 'Piso Cielo' },
  { value: 'CASSETTE', label: 'Cassette' },
  { value: 'CENTRAL_DUCTOS', label: 'Central de Ductos' },
  { value: 'CHILLER', label: 'Chiller' },
] as const

export const LOCATIONS = [
  { value: 'NIVEL_1', label: 'Nivel 1' },
  { value: 'NIVEL_2', label: 'Nivel 2' },
  { value: 'NIVEL_3', label: 'Nivel 3' },
  { value: 'SOTANO_1', label: 'Sótano 1' },
  { value: 'SOTANO_2', label: 'Sótano 2' },
  { value: 'SOTANO_3', label: 'Sótano 3' },
] as const

export type AcType = (typeof AC_TYPES)[number]['value']
export type LocationCode = (typeof LOCATIONS)[number]['value']

const AC_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  AC_TYPES.map((t) => [t.value, t.label])
)
const LOCATION_LABELS: Record<string, string> = Object.fromEntries(
  LOCATIONS.map((l) => [l.value, l.label])
)

export const acTypeLabel = (value: string): string => AC_TYPE_LABELS[value] || value
export const locationLabel = (value: string): string => LOCATION_LABELS[value] || value

// Lista de verificación estándar para el mantenimiento de un local.
// `hasValue: true` indica que el ítem además captura un valor medido.
export const LOCAL_CHECKLIST_ITEMS = [
  { id: 1, label: 'Lavado de evaporador y condensador', hasValue: false },
  { id: 2, label: 'Limpieza de drenaje y de bandeja', hasValue: false },
  { id: 3, label: 'Revisión de insulación de tubería', hasValue: false },
  { id: 4, label: 'Limpieza de difusores', hasValue: false },
  { id: 5, label: 'Tomar amperaje y voltaje de compresor', hasValue: true },
  { id: 6, label: 'Limpieza contacto de mando', hasValue: false },
  { id: 7, label: 'Limpieza de blower', hasValue: false },
  { id: 8, label: 'Tomar amperajes y voltaje de motor fan', hasValue: true },
  { id: 9, label: 'Revisión estado de ductos de descarga', hasValue: false },
  { id: 10, label: 'Presiones de refrigerante', hasValue: true },
  { id: 11, label: 'Carga de refrigerante si necesita', hasValue: false },
  { id: 12, label: 'Soportería de evaporador y condensador', hasValue: false },
  { id: 13, label: 'Set de termostato', hasValue: true },
] as const
