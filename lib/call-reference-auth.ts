import { createHmac, timingSafeEqual } from 'node:crypto'
import { CALL_AGENT_ID } from '@/lib/call-agent-guardrails'

const TOKEN_CONTEXT = `care-call-reference-lookup:${CALL_AGENT_ID}`

export function getCallReferenceLookupToken() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('Supabase service role key is not configured.')
  return createHmac('sha256', serviceRoleKey).update(TOKEN_CONTEXT).digest('hex')
}

export function hasValidCallReferenceAuthorization(header: string | null) {
  if (!header?.startsWith('Bearer ')) return false
  const supplied = Buffer.from(header.slice(7).trim())
  const expected = Buffer.from(getCallReferenceLookupToken())
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
