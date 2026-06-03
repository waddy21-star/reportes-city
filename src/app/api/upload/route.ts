import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const file = formData.get('file') as File
  const reportId = formData.get('reportId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo se aceptan imágenes.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo excede el tamaño máximo de 15 MB.' }, { status: 400 })
  }

  // If a reportId is provided, verify it belongs to the requesting user (or user is admin).
  if (reportId) {
    const report = await prisma.report.findUnique({ where: { id: reportId }, select: { userId: true } })
    if (!report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }
    if (session.user.role !== 'ADMIN' && report.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
    const filename = `${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    const path = `/uploads/${filename}`

    if (reportId) {
      const photo = await prisma.photo.create({
        data: { reportId, filename, path },
      })
      return NextResponse.json({ photo, path }, { status: 201 })
    }

    return NextResponse.json({ path, filename }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al guardar el archivo' }, { status: 500 })
  }
}
