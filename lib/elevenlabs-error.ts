function messageFrom(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const messages = value.map(messageFrom).filter((message): message is string => message !== null)
    return messages.length ? messages.join('; ') : null
  }
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const candidate = record.msg ?? record.message ?? record.error ?? record.detail
  const message = messageFrom(candidate)
  if (!message) return null

  const location = Array.isArray(record.loc)
    ? record.loc.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number').join('.')
    : ''
  return location ? `${location}: ${message}` : message
}

export function getElevenLabsErrorMessage(payload: unknown, fallback: string) {
  const message = messageFrom(payload)
  if (message) return message

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>
    return messageFrom(record.detail) ?? messageFrom(record.message) ?? fallback
  }

  return fallback
}
