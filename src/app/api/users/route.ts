import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { serializeDepts, parseDepts } from '@/lib/departments'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      active: true,
      createdAt: true,
      _count: { select: { reports: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role, department, departments } = body

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  // Accept `departments` (array) or fall back to `department` (single string)
  const deptValue = Array.isArray(departments)
    ? serializeDepts(departments)
    : department !== undefined
      ? (department || null)
      : null

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role || 'USER',
      department: deptValue,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      active: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
