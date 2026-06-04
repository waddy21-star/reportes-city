import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseDepts, ALL_DEPARTMENTS } from '@/lib/departments'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const department = searchParams.get('department')
  const level = searchParams.get('level')
  const userId = searchParams.get('userId')
  const keyword = searchParams.get('keyword')

  const where: any = {}

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  if (department) where.department = department
  if (level) where.level = level
  if (userId) where.userId = userId
  if (keyword) {
    where.notes = { contains: keyword }
  }

  // Non-admin users see all reports from their departments
  if (session.user.role !== 'ADMIN') {
    const userDepts = parseDepts(session.user.department)
    if (userDepts.length > 0) {
      where.department = { in: userDepts }
    } else {
      where.userId = session.user.id
    }
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, department: true } },
      reportTasks: {
        include: {
          task: true,
          checkItems: true,
        },
      },
      photos: true,
      localRecords: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(reports)
}

type LocalRecordInput = {
  localName: string
  acType: string
  location: string
  items: { id: number; label: string; checked: boolean }[]
  hasIssue: boolean
  issueNote?: string
}

const VALID_DEPARTMENTS = ALL_DEPARTMENTS as readonly string[]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const { department, level, status, notes, signature, tasks, localRecords } = body

  // Non-admins can only file reports for their own department.
  const reportDepartment =
    session.user.role === 'ADMIN' ? department : session.user.department
  if (!reportDepartment || !VALID_DEPARTMENTS.includes(reportDepartment)) {
    return NextResponse.json({ error: 'Departamento inválido' }, { status: 400 })
  }

  // Validate that every referenced task actually belongs to this department,
  // so a client cannot attach tasks from other departments.
  const taskIds: string[] = Array.isArray(tasks)
    ? tasks.map((t: any) => t?.taskId).filter(Boolean)
    : []
  if (taskIds.length > 0) {
    const validCount = await prisma.task.count({
      where: { id: { in: taskIds }, department: reportDepartment },
    })
    if (validCount !== taskIds.length) {
      return NextResponse.json(
        { error: 'Una o más tareas no pertenecen al departamento' },
        { status: 400 }
      )
    }
  }

  try {
  const report = await prisma.report.create({
    data: {
      userId: session.user.id,
      department: reportDepartment,
      level: level === 'URGENTE' ? 'URGENTE' : 'NORMAL',
      status: status === 'COMPLETADO' ? 'COMPLETADO' : 'ACTIVO',
      notes,
      signature,
      reportTasks: {
        create: tasks?.map((task: any) => ({
          taskId: task.taskId,
          hasIncident: task.hasIncident || false,
          incidentNote: task.incidentNote,
          checkItems: {
            create: task.checkItems?.map((item: any) => ({
              checklistItemId: item.checklistItemId,
              checked: item.checked || false,
            })) || [],
          },
        })) || [],
      },
      localRecords: localRecords && localRecords.length > 0
        ? {
            create: localRecords.map((rec: LocalRecordInput) => ({
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
    include: {
      user: { select: { id: true, name: true, department: true } },
      reportTasks: {
        include: {
          task: true,
          checkItems: { include: { checklistItem: true } },
        },
      },
      photos: true,
      localRecords: true,
    },
  })

  return NextResponse.json(report, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear el reporte' }, { status: 500 })
  }
}
