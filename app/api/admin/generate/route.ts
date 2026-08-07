import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const requestSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).default(''),
  question_count: z.coerce.number().int().min(1).max(100),
  mode: z.enum(['assessment', 'questions']).default('assessment'),
})

const draftSchema = z.object({
  description: z.string(),
  instructions: z.string(),
  salary_min: z.number().nonnegative(),
  salary_max: z.number().nonnegative(),
  salary_currency: z.string().length(3),
  questions: z.array(z.object({
    competency: z.string(),
    prompt: z.string(),
    options: z.array(z.string()).length(4),
    answer_key: z.string(),
  })),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 })
  try {
    const input = requestSchema.parse(await request.json())
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
    const questionSchema = z.object({
      questions: z.array(z.object({ competency: z.string(), prompt: z.string(), options: z.array(z.string()).length(4), answer_key: z.string() })),
    })
    const schema = input.mode === 'questions' ? questionSchema : draftSchema
    const result = await generateText({
      model: google('gemini-3.5-flash'),
      output: Output.object({ schema }),
      prompt: input.mode === 'questions'
        ? `Create exactly ${input.question_count} new scenario-based multiple-choice questions for a CARE International assessment titled ${input.title}. Context: ${input.description || 'No additional context.'}. Each must include a competency, prompt, exactly four distinct options, and answer_key matching one option. Return only the structured object.`
        : `Create a structured skill assessment draft for CARE International. Position: ${input.title}. Context: ${input.description || 'No additional context.'}. Generate exactly ${input.question_count} questions. Every question must be scenario-based, include one competency, exactly four distinct answer options, and answer_key equal to one option. Recommend a realistic salary range in USD. Return only the requested structured object.`,
    })
    if (!result.output || result.output.questions.length !== input.question_count) return NextResponse.json({ error: 'Gemini returned an incomplete assessment draft.' }, { status: 502 })
    if (input.mode === 'assessment') {
      const output = result.output as z.infer<typeof draftSchema>
      if (output.salary_min > output.salary_max) return NextResponse.json({ error: 'Gemini returned an invalid salary range.' }, { status: 502 })
      return NextResponse.json({ draft: output })
    }
    return NextResponse.json({ draft: result.output })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid generation request.' }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? `Gemini generation failed: ${error.message}` : 'Gemini generation failed.' }, { status: 502 })
  }
}
