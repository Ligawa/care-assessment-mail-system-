import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

const schema = z.object({ accessCode: z.string().min(1), role: z.string().min(1), candidateName: z.string().min(1), transcript: z.array(z.object({ speaker: z.enum(['Emmy Nana', 'Candidate']), text: z.string().min(1) })).min(2).max(40) })

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'A complete interview is required.' }, { status: 400 })
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'Gemini API key is not configured.' }, { status: 500 })
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  const result = await generateText({ model: google('gemini-3.5-flash'), system: 'You are a fair recruitment assessor. Return only valid JSON with keys summary, strengths, concerns, scores, recommendation. scores must contain communication, roleKnowledge, judgment, motivation, and experience as integers from 1 to 5. recommendation must be one of Strongly recommend, Recommend, Consider, Do not recommend. Base every conclusion only on the transcript.', prompt: `Role: ${parsed.data.role}\nCandidate: ${parsed.data.candidateName}\nTranscript:\n${parsed.data.transcript.map(item => `${item.speaker}: ${item.text}`).join('\n')}` })
  let assessment: unknown
  try { assessment = JSON.parse(result.text.replace(/^```json\s*|\s*```$/g, '')) } catch { assessment = { summary: result.text } }
  return Response.json({ ok: true, assessment })
}
