import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  const reportId = formData.get('reportId') as string

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })

  const timestamp = Date.now()
  const ext = file.name.split('.').pop()
  const filename = `${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`
  const filepath = join(uploadsDir, filename)

  await writeFile(filepath, buffer)

  const path = `/uploads/${filename}`

  if (reportId) {
    const photo = await prisma.photo.create({
      data: {
        reportId,
        filename,
        path,
      },
    })
    return NextResponse.json({ photo, path }, { status: 201 })
  }

  return NextResponse.json({ path, filename }, { status: 201 })
}
