import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const fullInclude = {
  user: { select: { id: true, name: true, department: true } },
  reportTasks: {
    include: {
      task: true,
      checkItems: { include: { checklistItem: true } },
    },
  },
  photos: true,
  localRecords: true,
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: fullInclude,
  })

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Non-admin can only see their own reports
  if (session.user.role !== 'ADMIN' && report.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(report)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOwner = report.userId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { level, status, notes, signature, tasks, localRecords, removePhotoIds, fullEdit } = body

  // --- Acción ligera: cambiar solo estado y/o nivel ---
  // (admin puede en cualquier momento; el autor también puede cerrar/abrir).
  if (!fullEdit) {
    const data: any = {}
    if (level === 'NORMAL' || level === 'URGENTE') data.level = level
    if (status === 'ACTIVO' || status === 'COMPLETADO') data.status = status
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
    }
    const updated = await prisma.report.update({ where: { id }, data, include: fullInclude })
    return NextResponse.json(updated)
  }

  // --- Edición completa: solo el autor y solo mientras el reporte está ACTIVO ---
  if (!isOwner) {
    return NextResponse.json({ error: 'Solo el autor puede editar el reporte' }, { status: 403 })
  }
  if (report.status !== 'ACTIVO') {
    return NextResponse.json(
      { error: 'El reporte está completado y ya no se puede editar' },
      { status: 409 }
    )
  }

  // Validar que las tareas pertenezcan al departamento del reporte
  const taskIds: string[] = Array.isArray(tasks)
    ? tasks.map((t: any) => t?.taskId).filter(Boolean)
    : []
  if (taskIds.length > 0) {
    const validCount = await prisma.task.count({
      where: { id: { in: taskIds }, department: report.department },
    })
    if (validCount !== taskIds.length) {
      return NextResponse.json(
        { error: 'Una o más tareas no pertenecen al departamento' },
        { status: 400 }
      )
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Reemplazar tareas y locales (más simple y consistente que hacer diff)
      await tx.reportTask.deleteMany({ where: { reportId: id } })
      await tx.localMaintenanceRecord.deleteMany({ where: { reportId: id } })

      // Borrar fotos marcadas para eliminar
      if (Array.isArray(removePhotoIds) && removePhotoIds.length > 0) {
        await tx.photo.deleteMany({
          where: { id: { in: removePhotoIds }, reportId: id },
        })
      }

      await tx.report.update({
        where: { id },
        data: {
          level: level === 'URGENTE' ? 'URGENTE' : 'NORMAL',
          ...(status === 'ACTIVO' || status === 'COMPLETADO' ? { status } : {}),
          notes: notes ?? null,
          ...(signature !== undefined ? { signature } : {}),
          reportTasks: {
            create: (Array.isArray(tasks) ? tasks : []).map((task: any) => ({
              taskId: task.taskId,
              hasIncident: task.hasIncident || false,
              incidentNote: task.incidentNote || null,
              checkItems: {
                create: (task.checkItems || []).map((item: any) => ({
                  checklistItemId: item.checklistItemId,
                  checked: item.checked || false,
                })),
              },
            })),
          },
          localRecords:
            Array.isArray(localRecords) && localRecords.length > 0
              ? {
                  create: localRecords.map((rec: any) => ({
                    localName: rec.localName,
                    acType: rec.acType,
                    location: rec.location,
                    items: JSON.stringify(rec.items),
                    hasIssue: rec.hasIssue || false,
                    issueNote: rec.issueNote || null,
                  })),
                }
              : undefined,
        },
      })
    })

    const updated = await prisma.report.findUnique({ where: { id }, include: fullInclude })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el reporte' }, { status: 500 })
  }
}
