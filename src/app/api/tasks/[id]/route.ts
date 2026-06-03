import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!task.isCustom) {
    return NextResponse.json({ error: 'Cannot delete system tasks' }, { status: 400 })
  }

  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
