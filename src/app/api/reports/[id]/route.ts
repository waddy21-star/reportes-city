import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
  const body = await req.json()
  const { level, status } = body

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Only admin can change level/status
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      ...(level && { level }),
      ...(status && { status }),
    },
    include: {
      user: { select: { id: true, name: true, department: true } },
      reportTasks: { include: { task: true, checkItems: { include: { checklistItem: true } } } },
      photos: true,
      localRecords: true,
    },
  })

  return NextResponse.json(updated)
}
