import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const maxDuration = 60

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'Gemini API key is not configured.' }, { status: 500 })
  const audio = new Uint8Array(await request.arrayBuffer())
  if (audio.byteLength < 2000) return Response.json({ text: '' })
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  try {
    const result = await generateText({
      model: google('gemini-3.5-flash'),
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe the speech in this audio exactly as spoken. Return only the transcript text with no commentary. If there is no intelligible speech, return an empty response.' },
          { type: 'file', data: audio, mediaType: 'audio/wav' },
        ],
      }],
    })
    return Response.json({ text: result.text.trim() })
  } catch {
    return Response.json({ error: 'Could not transcribe the recording.' }, { status: 502 })
  }
}
