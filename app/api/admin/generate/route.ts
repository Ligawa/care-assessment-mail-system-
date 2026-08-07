import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({error:'Staff access required.'},{status:403})
  const input = await request.json()
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({error:'Gemini API key is not configured.'},{status:500})
  try {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `Create a JSON-ready draft for a Care International skill assessment role. Position: ${input.title}. Context: ${input.description}. Number of questions: ${input.question_count}. Include complex scenario questions with competency, prompt, four options, and answer key. Also recommend a salary min and max with currency. Do not include commentary.`,
    })
    return NextResponse.json({ draft: result.text })
  } catch {
    return NextResponse.json({ error:'Gemini generation failed.' }, { status:500 })
  }
}
