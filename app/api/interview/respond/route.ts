import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const inputSchema = z.object({
  role: z.string().min(1),
  candidateName: z.string().min(1),
  accessCode: z.string().optional(),
  transcript: z.array(z.object({ speaker: z.enum(['Emmy Nana', 'Candidate']), text: z.string().min(1) })).max(30),
})

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Invalid interview request.' }, { status: 400 })
  const { role, candidateName, transcript, accessCode } = parsed.data
  if (accessCode) {
    const { error: startError } = await createAdminClient().from('interview_sessions').update({ started_at: new Date().toISOString() }).eq('access_code', accessCode.toUpperCase()).is('started_at', null)
    if (startError) console.error('[v0] Could not record interview start:', startError.message)
  }
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'Gemini API key is not configured.' }, { status: 500 })
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  const result = await generateText({
    model: google('gemini-3.5-flash'),
    system: `You are Emmy Nana, a professional female AI interviewer for CARE International. Conduct a structured but adaptive job interview for the role: ${role}. The candidate is ${candidateName}. In your first response, introduce yourself as Emmy Nana, introduce CARE International in one sentence, and explain these role details aloud before asking the candidate to introduce themselves: this is a remote role processed through the Rwanda office and potentially Cape Verde; basic salary is USD 4,500 per month with additional bonuses and allowances described in the contract; if successful, documents must be submitted in French, English, and Portuguese; translation is not paid upfront but eligible costs may be reimbursed after receipts are submitted, with more detail during onboarding. Keep this first response under 125 words. Then ask one question at a time, choosing follow-ups from the candidate's actual answers and the role requirements rather than using a fixed script. Be warm, concise, human, and professional. Stay strictly on the interview topic. Do not discuss unrelated subjects, politics, religion, personal gossip, or make hiring promises. Ask a brief follow-up only when useful. Keep each response under 55 words. After enough evidence across role knowledge, judgment, communication, motivation, and relevant experience, thank the candidate and say the hiring team will review the interview. When the interview is complete, end your response with the exact marker [INTERVIEW_COMPLETE]. Ask no more questions after that marker.`,
    prompt: transcript.map(item => `${item.speaker}: ${item.text}`).join('\n'),
  })
  const completed = result.text.includes('[INTERVIEW_COMPLETE]')
  return Response.json({ text: result.text.replace('[INTERVIEW_COMPLETE]', '').trim(), completed })
}
