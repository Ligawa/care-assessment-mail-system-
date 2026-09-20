import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

const inputSchema = z.object({
  role: z.string().min(1),
  candidateName: z.string().min(1),
  transcript: z.array(z.object({ speaker: z.enum(['Emmy Nana', 'Candidate']), text: z.string().min(1) })).max(30),
})

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Invalid interview request.' }, { status: 400 })
  const { role, candidateName, transcript } = parsed.data
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'Gemini API key is not configured.' }, { status: 500 })
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  const result = await generateText({
    model: google('gemini-3.5-flash'),
    system: `You are Emmy Nana, a professional female AI interviewer for CARE International. Conduct a structured but adaptive job interview for the role: ${role}. The candidate is ${candidateName}. In your first response, introduce yourself as Emmy Nana, introduce CARE International in one sentence, and ask the candidate to introduce themselves. Then ask one question at a time, choosing follow-ups from the candidate's actual answers and the role requirements rather than using a fixed script. Be warm, concise, human, and professional. Stay strictly on the interview topic. Do not discuss unrelated subjects, politics, religion, personal gossip, or make hiring promises. Ask a brief follow-up only when useful. Keep each response under 55 words. After enough evidence across role knowledge, judgment, communication, motivation, and relevant experience, thank the candidate and say the hiring team will review the interview.`,
    prompt: transcript.map(item => `${item.speaker}: ${item.text}`).join('\n'),
  })
  return Response.json({ text: result.text })
}
