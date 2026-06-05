import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseDepts } from '@/lib/departments'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let label: string | undefined
  try {
    ({ label } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  if (!label?.trim()) return NextResponse.json({ error: 'Label requerido' }, { status: 400 })

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })

  // Validate user can add items to this task's department
  if (session.user.role !== 'ADMIN') {
    const userDepts = parseDepts(session.user.department)
    if (!userDepts.includes(task.department)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const maxOrder = await prisma.checklistItem.count({ where: { taskId: id } })
  const item = await prisma.checklistItem.create({
    data: { label: label.trim(), taskId: id, order: maxOrder },
  })

  return NextResponse.json(item, { status: 201 })
}
