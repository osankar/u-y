/** Log API errors without inquiry or contact PII in the message payload. */
export function logApiError(context: string, code?: string | null) {
  console.error(`[${context}]`, code ?? 'error')
}
