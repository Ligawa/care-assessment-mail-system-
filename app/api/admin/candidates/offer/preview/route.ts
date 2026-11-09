import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOfferLetterPdf } from '@/lib/offer-letter-pdf'
import { offerSchema } from '@/lib/offer-letter-schema'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const parsed = offerSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Complete all offer fields, including a basic salary greater than zero.' }, { status: 400 })
  const input = parsed.data
  const hrReference = `CARE-${new Date().getUTCFullYear()}-${input.submissionId.replaceAll('-', '').slice(0, 8).toUpperCase()}`
  const bytes = await buildOfferLetterPdf({ ...input, hrReference, issueDate: new Date() })
  return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="offer-draft-${hrReference}.pdf"`, 'Cache-Control': 'no-store' } })
}
