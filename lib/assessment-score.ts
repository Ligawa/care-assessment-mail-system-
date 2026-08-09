type Json = unknown

export type ScoreQuestion = { id: string; position: number; competency: string | null; prompt: string; options: Json | null; answer_key: string | null }

export function calculateAssessmentScore(questions: ScoreQuestion[], answers: Record<string, unknown> | null) {
  const submitted = answers ?? {}
  const answeredQuestions = questions.filter(question => submitted[question.id] !== undefined && submitted[question.id] !== null && String(submitted[question.id]).trim() !== '')
  const correct = questions.filter(question => question.answer_key !== null && String(submitted[question.id] ?? '') === String(question.answer_key)).length
  return { correct, total: questions.length, answered: answeredQuestions.length, percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0 }
}

export function optionLabel(options: Json | null, value: unknown) {
  if (!Array.isArray(options)) return String(value ?? 'No answer')
  const option = options.find(item => typeof item === 'object' && item !== null && 'value' in item && String(item.value) === String(value))
  return option && typeof option === 'object' && 'label' in option ? String(option.label) : String(value ?? 'No answer')
}
