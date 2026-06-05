import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ALL_DEPARTMENTS } from '@/lib/departments'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')

  const where: Prisma.TaskWhereInput = {}
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

const VALID_DEPARTMENTS = ALL_DEPARTMENTS as readonly string[]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; department?: string; checkItems?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const { name, department, checkItems } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  // Non-admins can only create tasks in their own department.
  // Admins must pass a valid department.
  const targetDepartment =
    session.user.role === 'ADMIN' ? department : session.user.department
  if (!targetDepartment || !VALID_DEPARTMENTS.includes(targetDepartment)) {
    return NextResponse.json({ error: 'Departamento inválido' }, { status: 400 })
  }

  try {
    const task = await prisma.task.create({
      data: {
        name: name.trim(),
        department: targetDepartment,
        // timeSlot is never accepted from the client: "MALL" and security
        // time slots are reserved for seeded tasks. Custom tasks have none.
        timeSlot: null,
        isCustom: true,
        checkItems: {
          create:
            (Array.isArray(checkItems) ? checkItems : [])
              .map((label, idx) => ({ label: String(label), order: idx })),
        },
      },
      include: {
        checkItems: { orderBy: { order: 'asc' } },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear la tarea' }, { status: 500 })
  }
}
