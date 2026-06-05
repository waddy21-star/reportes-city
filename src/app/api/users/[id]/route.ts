import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { serializeDepts } from '@/lib/departments'
import type { UserUpdateInput } from '@/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: UserUpdateInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const { name, email, password, role, department, departments, active } = body

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // If changing email, ensure it isn't taken by another user.
  if (email !== undefined && email !== existing.email) {
    const taken = await prisma.user.findUnique({ where: { email } })
    if (taken) {
      return NextResponse.json(
        { error: 'Ese correo ya está en uso' },
        { status: 409 }
      )
    }
  }

  const updateData: Prisma.UserUpdateInput = {}
  if (name !== undefined) updateData.name = name
  if (email !== undefined) updateData.email = email
  if (role !== undefined) updateData.role = role
  if (Array.isArray(departments)) {
    updateData.department = serializeDepts(departments)
  } else if (department !== undefined) {
    updateData.department = department || null
  }
  if (active !== undefined) updateData.active = active
  if (password) {
    updateData.password = await bcrypt.hash(password, 12)
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 })
  }
}
