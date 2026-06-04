import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Paleta CityMall
const NAVY: [number, number, number] = [28, 53, 87] // #1C3557
const ORANGE: [number, number, number] = [244, 121, 32] // #F47920
const RED: [number, number, number] = [214, 68, 64] // #D64440
const GREEN: [number, number, number] = [34, 197, 94] // #22C55E
const GRAY: [number, number, number] = [107, 114, 128]

const departmentLabels: Record<string, string> = {
  SEGURIDAD: 'Seguridad',
  ELECTRICO: 'Eléctrico',
  CIVIL: 'Civil',
  REFRIGERACION: 'Refrigeración',
}

const AC_TYPE_LABELS: Record<string, string> = {
  MINI_SPLIT: 'Mini Split',
  PISO_CIELO: 'Piso Cielo',
  CASSETTE: 'Cassette',
  CENTRAL_DUCTOS: 'Central de Ductos',
  CHILLER: 'Chiller',
}

const LOCATION_LABELS: Record<string, string> = {
  NIVEL_1: 'Nivel 1',
  NIVEL_2: 'Nivel 2',
  NIVEL_3: 'Nivel 3',
  SOTANO_1: 'Sótano 1',
  SOTANO_2: 'Sótano 2',
  SOTANO_3: 'Sótano 3',
}

interface PdfChecklistItem {
  checked: boolean
  checklistItem: { label: string }
}
interface PdfReportTask {
  hasIncident: boolean
  incidentNote: string | null
  task: { name: string; timeSlot: string | null }
  checkItems: PdfChecklistItem[]
}
interface PdfLocalRecord {
  localName: string
  acType: string
  location: string
  items: string
  hasIssue: boolean
  issueNote: string | null
}
export interface PdfReport {
  id: string
  department: string
  level: string
  status: string
  notes: string | null
  signature: string | null
  createdAt: string
  user: { name: string }
  reportTasks: PdfReportTask[]
  photos: { path: string }[]
  localRecords?: PdfLocalRecord[]
}

// Convierte una imagen del sitio (ej. el logo) a dataURL para incrustarla.
async function loadImageAsDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}, ${hh}:${mm}`
}

export async function generateReportPdf(report: PdfReport): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  const logo = await loadImageAsDataURL('/citymall-logo.png')

  // ===== Encabezado =====
  const headerH = 30
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageW, headerH, 'F')
  // franja naranja inferior del encabezado
  doc.setFillColor(...ORANGE)
  doc.rect(0, headerH, pageW, 1.5, 'F')

  if (logo) {
    // recuadro blanco para el logo
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, 6, 18, 18, 2, 2, 'F')
    try { doc.addImage(logo, 'PNG', margin + 1.5, 7.5, 15, 15) } catch {}
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('CityMall', margin + (logo ? 23 : 0), 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(210, 220, 235)
  doc.text('Reporte de Mantenimiento', margin + (logo ? 23 : 0), 20)

  // Departamento (derecha)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(
    (departmentLabels[report.department] || report.department).toUpperCase(),
    pageW - margin,
    14,
    { align: 'right' }
  )
  // Nivel / estado (derecha)
  doc.setFontSize(9)
  const levelTxt = report.level === 'URGENTE' ? 'URGENTE' : 'Normal'
  const statusTxt = report.status === 'COMPLETADO' ? 'Completado' : 'Activo'
  doc.setTextColor(report.level === 'URGENTE' ? 255 : 210, report.level === 'URGENTE' ? 200 : 220, report.level === 'URGENTE' ? 200 : 235)
  doc.text(`${levelTxt}  ·  ${statusTxt}`, pageW - margin, 20, { align: 'right' })

  let y = headerH + 8

  // ===== Datos generales =====
  doc.setDrawColor(232, 236, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, pageW - margin * 2, 16, 2, 2, 'FD')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('RESPONSABLE', margin + 4, y + 5)
  doc.text('FECHA', margin + 4, y + 11)
  doc.text('N° DE REPORTE', pageW / 2 + 4, y + 5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text(report.user.name, margin + 32, y + 5)
  doc.text(fmtDate(report.createdAt), margin + 32, y + 11)
  doc.text(report.id.slice(-8).toUpperCase(), pageW / 2 + 36, y + 5)
  doc.setFont('helvetica', 'normal')
  y += 22

  const isRefrig = report.department === 'REFRIGERACION'

  // Solo lo que se hizo: tareas con incidente o con al menos un item marcado
  const doneTasks = report.reportTasks.filter(
    t => t.hasIncident || t.checkItems.some(i => i.checked)
  )

  // ===== Tareas ejecutadas =====
  if (doneTasks.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(isRefrig ? 'Tareas Mall ejecutadas' : 'Tareas ejecutadas', margin, y)
    y += 2

    const rows = doneTasks.map(t => {
      const done = t.checkItems.filter(i => i.checked).map(i => `• ${i.checklistItem.label}`)
      const detalle = done.length > 0 ? done.join('\n') : '—'
      const incidente = t.hasIncident ? `INCIDENTE: ${t.incidentNote || 'sin detalle'}` : ''
      const cell = incidente ? `${detalle}\n${incidente}` : detalle
      const nombre = (t.task.timeSlot && t.task.timeSlot !== 'MALL' ? `[${t.task.timeSlot}] ` : '') + t.task.name
      return [nombre, cell]
    })

    autoTable(doc, {
      startY: y + 2,
      head: [['Tarea', 'Detalle de lo realizado']],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, valign: 'top', textColor: [55, 65, 81] },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: cell => {
        if (cell.section === 'body' && cell.column.index === 1 && String(cell.cell.raw).includes('INCIDENTE:')) {
          cell.cell.styles.textColor = RED
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ===== Refrigeración: locales =====
  const locals = report.localRecords || []
  if (isRefrig && locals.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(`Mantenimiento de Locales (${locals.length})`, margin, y)

    const rows = locals.map(rec => {
      let items: { label: string; checked: boolean; value?: string }[] = []
      try { items = JSON.parse(rec.items) } catch {}
      const done = items.filter(i => i.checked).map(i => `• ${i.label}${i.value ? `: ${i.value}` : ''}`).join('\n') || '—'
      const tipo = `${AC_TYPE_LABELS[rec.acType] || rec.acType} · ${LOCATION_LABELS[rec.location] || rec.location}`
      const detalle = rec.hasIssue ? `${done}\nPROBLEMA: ${rec.issueNote || 'sin detalle'}` : done
      return [rec.localName, tipo, detalle]
    })

    autoTable(doc, {
      startY: y + 4,
      head: [['Local', 'Equipo', 'Realizado']],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, valign: 'top', textColor: [55, 65, 81] },
      headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' }, 1: { cellWidth: 38 }, 2: { cellWidth: 'auto' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: cell => {
        if (cell.section === 'body' && cell.column.index === 2 && String(cell.cell.raw).includes('PROBLEMA:')) {
          cell.cell.styles.textColor = RED
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ===== Notas =====
  if (report.notes && report.notes.trim()) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text('Notas generales', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(55, 65, 81)
    const lines = doc.splitTextToSize(report.notes, pageW - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 4.5 + 6
  }

  // ===== Fotografías =====
  if (report.photos && report.photos.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(`Fotografías (${report.photos.length})`, margin, y)
    y += 5

    const colCount = 3
    const photoW = (pageW - margin * 2 - (colCount - 1) * 4) / colCount
    const photoH = photoW * 0.75
    let col = 0

    for (const photo of report.photos) {
      const imgData = await loadImageAsDataURL(photo.path)
      if (!imgData) continue

      if (col === 0 && y + photoH > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 20
      }

      const x = margin + col * (photoW + 4)
      doc.setDrawColor(232, 236, 240)
      doc.roundedRect(x, y, photoW, photoH, 2, 2, 'D')
      try { doc.addImage(imgData, 'JPEG', x + 0.5, y + 0.5, photoW - 1, photoH - 1) } catch {}

      col++
      if (col >= colCount) {
        col = 0
        y += photoH + 4
      }
    }

    if (col > 0) y += photoH + 4
    y += 4
  }

  // ===== Firma =====
  if (report.signature) {
    if (y > 235) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text('Firma digital', margin, y)
    y += 4
    doc.setDrawColor(232, 236, 240)
    doc.roundedRect(margin, y, 80, 32, 2, 2, 'D')
    try { doc.addImage(report.signature, 'PNG', margin + 2, y + 2, 76, 28) } catch {}
    y += 35
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`Firmado por ${report.user.name}`, margin, y)
  }

  // ===== Pie de página en todas las hojas =====
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    const ph = doc.internal.pageSize.getHeight()
    doc.setDrawColor(232, 236, 240)
    doc.line(margin, ph - 12, pageW - margin, ph - 12)
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text('CityMall · Sistema interno de reportes de mantenimiento', margin, ph - 7)
    doc.text(`Página ${i} de ${pages}`, pageW - margin, ph - 7, { align: 'right' })
  }

  const dept = (departmentLabels[report.department] || report.department).replace(/\s/g, '-')
  const datePart = new Date(report.createdAt).toISOString().slice(0, 10)
  doc.save(`Reporte-${dept}-${datePart}-${report.id.slice(-6)}.pdf`)
}
