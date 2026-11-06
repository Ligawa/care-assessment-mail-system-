import { get } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const pathname = request.nextUrl.searchParams.get('pathname')
  if (!pathname) return NextResponse.json({ error: 'Missing document.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: document } = await supabase.from('applicant_documents').select('pathname').eq('pathname', pathname).maybeSingle()
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  const result = await get(pathname, { access: 'private' })
  if (!result) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  return new NextResponse(result.stream, { headers: { 'Content-Type': result.blob.contentType || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${pathname.split('/').pop()?.replace(/^[^-]+-/, '') || 'document'}"`, 'Cache-Control': 'private, no-store' } })
}
