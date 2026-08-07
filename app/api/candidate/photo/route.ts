import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !['image/jpeg','image/png'].includes(file.type) || file.size > 5_000_000) return NextResponse.json({ error:'Upload a JPG or PNG image under 5MB.' }, { status:400 })
  const blob = await put(`candidate-photos/${crypto.randomUUID()}-${file.name}`, file, { access:'private', addRandomSuffix:false })
  return NextResponse.json({ pathname:blob.pathname })
}
