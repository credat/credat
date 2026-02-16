import { CredatError, ErrorCodes } from '../errors'

export function extractJson(content: string): string {
  // Handle markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch?.[1]) return jsonMatch[1]

  // Try raw JSON (object or array)
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed

  throw new CredatError(
    ErrorCodes.AI_PARSE_FAILED,
    'Could not extract JSON from AI response',
    'The AI model returned an unexpected response format. Try again or use a different model.',
  )
}
