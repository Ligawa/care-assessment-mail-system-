export const DEFAULT_INTERVIEW_VOICE = {
  id: 'JBFqnCBsd6RMkjVDRZzb',
  name: 'George - Warm, Captivating Storyteller',
  language: 'en',
} as const

export function isElevenLabsVoiceId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value)
}
