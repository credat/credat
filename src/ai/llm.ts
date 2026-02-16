import type { AIConfig } from '../types'
import { CredatError, ErrorCodes } from '../errors'

export interface LLMRequest {
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
}

export interface LLMResponse {
  content: string
}

export async function callLLM(config: AIConfig, request: LLMRequest): Promise<LLMResponse> {
  if (!config.apiKey) {
    throw new CredatError(
      ErrorCodes.INVALID_CONFIG,
      'AI API key is required',
      'Configure an AI API key: createClient({ ai: { provider: "anthropic", apiKey: "sk-..." } })',
    )
  }

  const apiKey = config.apiKey

  switch (config.provider) {
    case 'anthropic':
      return callAnthropic(config, apiKey, request)
    case 'openai':
      return callOpenAI(config, apiKey, request)
    case 'custom':
      return callCustom(config, apiKey, request)
    default:
      throw new CredatError(
        ErrorCodes.INVALID_CONFIG,
        `Unsupported AI provider: ${(config as AIConfig).provider}`,
      )
  }
}

async function callAnthropic(
  config: AIConfig,
  apiKey: string,
  request: LLMRequest,
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl ?? 'https://api.anthropic.com'
  const model = config.model ?? 'claude-sonnet-4-5-20250929'

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    // Prefill assistant with '{' to enforce JSON output (Anthropic has no native json_mode)
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: request.systemPrompt,
      messages: request.jsonMode
        ? [
            { role: 'user', content: request.userPrompt },
            { role: 'assistant', content: '{' },
          ]
        : [{ role: 'user', content: request.userPrompt }],
    }),
  })

  if (!response.ok) {
    const status = response.status
    const errorBody = await response.text().catch(() => 'unknown error')
    throw new CredatError(
      ErrorCodes.AI_REQUEST_FAILED,
      `Anthropic API error (${status}): ${errorBody.slice(0, 200)}`,
    )
  }

  const data = (await response.json()) as Record<string, unknown>
  const content = data.content as Array<{ type: string; text: string }> | undefined

  if (!content?.length) {
    throw new CredatError(
      ErrorCodes.AI_REQUEST_FAILED,
      'Anthropic API returned empty content',
    )
  }

  const text = content[0]?.text ?? ''
  // If we prefilled with '{', prepend it back to the response
  return { content: request.jsonMode ? `{${text}` : text }
}

async function callOpenAI(
  config: AIConfig,
  apiKey: string,
  request: LLMRequest,
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com'
  const model = config.model ?? 'gpt-4o'

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    max_tokens: 4096,
  }

  if (request.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const status = response.status
    const errorBody = await response.text().catch(() => 'unknown error')
    throw new CredatError(
      ErrorCodes.AI_REQUEST_FAILED,
      `OpenAI API error (${status}): ${errorBody.slice(0, 200)}`,
    )
  }

  const data = (await response.json()) as Record<string, unknown>
  const choices = data.choices as Array<{ message: { content: string } }> | undefined

  if (!choices?.length) {
    throw new CredatError(
      ErrorCodes.AI_REQUEST_FAILED,
      'OpenAI API returned empty choices',
    )
  }

  return { content: choices[0]?.message?.content ?? '' }
}

async function callCustom(
  config: AIConfig,
  apiKey: string,
  request: LLMRequest,
): Promise<LLMResponse> {
  if (!config.baseUrl) {
    throw new CredatError(
      ErrorCodes.INVALID_CONFIG,
      'Custom AI provider requires baseUrl',
      'Set baseUrl for your custom provider: { provider: "custom", baseUrl: "https://...", apiKey: "..." }',
    )
  }

  // OpenAI-compatible API
  return callOpenAI(config, apiKey, request)
}
