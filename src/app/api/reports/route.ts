import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  // Non-admin users can only see their own reports
  if (session.user.role !== 'ADMIN') {
    where.userId = session.user.id
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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { department, level, notes, signature, tasks, localRecords } = body

  const report = await prisma.report.create({
    data: {
      userId: session.user.id,
      department,
      level: level || 'NORMAL',
      status: 'COMPLETADO',
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
}
