import { createHmac, timingSafeEqual } from 'node:crypto'

const ELEVENLABS_INBOUND_URL = 'https://api.us.elevenlabs.io/twilio/inbound-calls'

function publicUrl(request: Request) {
  const url = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedHost) url.host = forwardedHost
  if (forwardedProto) url.protocol = `${forwardedProto}:`
  return url.toString()
}

function isValidTwilioRequest(request: Request, signature: string, authToken: string, form: FormData) {
  const params = new Map<string, string[]>()
  for (const [key, value] of form.entries()) {
    const values = params.get(key) ?? []
    values.push(typeof value === 'string' ? value : value.name)
    params.set(key, values)
  }

  let signedPayload = publicUrl(request)
  for (const key of [...params.keys()].sort()) {
    for (const value of params.get(key)!.sort()) signedPayload += key + value
  }
  const expected = createHmac('sha1', authToken).update(signedPayload).digest()
  const supplied = Buffer.from(signature, 'base64')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return new Response('Twilio webhook is not configured.', { status: 503 })

  const signature = request.headers.get('x-twilio-signature')
  if (!signature) return new Response('Forbidden.', { status: 403 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return new Response('Invalid Twilio request.', { status: 400 })
  }

  if (!isValidTwilioRequest(request, signature, authToken, form)) return new Response('Forbidden.', { status: 403 })

  const musicUrl = new URL('/audio/care-hold.wav', publicUrl(request)).toString()
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${musicUrl}</Play>
  <Redirect method="POST">${ELEVENLABS_INBOUND_URL}</Redirect>
</Response>`
  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
