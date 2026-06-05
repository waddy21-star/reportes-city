import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { serializeDepts } from '@/lib/departments'

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

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  const { name, email, password, role, department, departments } = body

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: 'Nombre, correo y contraseña son obligatorios' },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ese correo ya está en uso' }, { status: 400 })
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
