import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')

  const where: any = {}
  if (department) where.department = department

  const tasks = await prisma.task.findMany({
    where,
    include: {
      checkItems: { orderBy: { order: 'asc' } },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, department, timeSlot, checkItems } = body

  const task = await prisma.task.create({
    data: {
      name,
      department,
      timeSlot,
      isCustom: true,
      checkItems: {
        create: checkItems?.map((label: string, idx: number) => ({
          label,
          order: idx,
        })) || [],
      },
    },
    include: {
      checkItems: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
