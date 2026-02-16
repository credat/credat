import type { AIConfig, CredentialSchema, CredentialClaims } from '../types'
import { callLLM } from './llm'
import { extractJson } from './utils'

const SYSTEM_PROMPT = `You are generating realistic but FAKE test data for verifiable credential testing.

Given a credential schema, generate realistic mock claim values. Rules:
- Use realistic-looking but completely fake data (never use real people's data)
- Use European names and addresses (matching eIDAS context)
- Dates should be in ISO 8601 format (YYYY-MM-DD)
- Generate varied data (different names, ages, nationalities, etc.)
- Respect claim types: string → text, number → numeric, boolean → true/false, date → YYYY-MM-DD

Respond ONLY with a valid JSON array of claim objects. Each object should have the same keys as the schema's claims.
Do NOT include any text outside the JSON array. No markdown, no explanation.`

export async function generateTestFixtures(
  config: AIConfig,
  schema: CredentialSchema,
  count: number,
): Promise<CredentialClaims[]> {
  const claimDefs = Object.entries(schema.claims)
    .map(
      ([name, def]) =>
        `  ${name}: ${def.type}${def.required ? ' (required)' : ' (optional)'}${def.description ? ` — ${def.description}` : ''}`,
    )
    .join('\n')

  const response = await callLLM(config, {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Generate ${count} test fixture(s) for credential type "${schema.type}" (${schema.description ?? ''}).\n\nClaim definitions:\n${claimDefs}`,
    jsonMode: true,
  })

  const parsed = JSON.parse(extractJson(response.content)) as CredentialClaims[] | CredentialClaims
  return Array.isArray(parsed) ? parsed : [parsed]
}
