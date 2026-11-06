import { Resend } from 'resend'
import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const { id } = await params
  const supabase = createAdminClient()
  const { data: portal } = await supabase.from('applicant_document_portals').select('applicant_name,applicant_email,role').eq('id', id).maybeSingle()
  if (!portal) return NextResponse.json({ error: 'Applicant portal not found.' }, { status: 404 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })
  const token = randomBytes(32).toString('hex')
  const portalUrl = `https://assessment.care-intrenational.org/documents/${token}`
  await supabase.from('applicant_document_portals').update({ access_token_hash: createHash('sha256').update(token).digest('hex') }).eq('id', id)
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [portal.applicant_email], subject: 'Reminder: submit your supporting documents', html: `<p>Dear Applicant,</p><p>This is a reminder to submit your supporting documents for ${portal.role || 'your application'}.</p><p><a href="${portalUrl}">Upload documents securely</a></p><p>Kind regards,<br>CARE International Recruitment Team</p>` })
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  await supabase.from('applicant_document_portals').update({ last_reminder_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true })
}
