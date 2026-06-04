import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Sirve las fotos subidas leyéndolas del disco. Es necesario porque con
// output: 'standalone' Next.js NO sirve los archivos escritos en public/
// en tiempo de ejecución (solo los que existían al compilar). Así las fotos
// se ven tanto en el detalle del reporte como al generar el PDF.

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { filename } = await params

  // Evita path traversal: solo se permite un nombre de archivo simple.
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
  }

  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) {
    return NextResponse.json({ error: 'Tipo no permitido' }, { status: 400 })
  }

  try {
    const filepath = join(process.cwd(), 'public', 'uploads', filename)
    const buffer = await readFile(filepath)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
  }
}
