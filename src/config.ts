import type { ClientConfig } from './types'
import { VeraceError, ErrorCodes } from './errors'

const DEFAULT_CLOUD_URL = 'https://api.verace.dev'

export function validateConfig(config: ClientConfig): ClientConfig {
  if (config.mode === 'cloud' && !config.apiKey) {
    throw new VeraceError(
      ErrorCodes.MISSING_API_KEY,
      'API key is required for cloud mode',
      'You need an API key to use cloud mode. Get one at https://verace.dev/dashboard'
    )
  }

  return {
    ...config,
    baseUrl: config.baseUrl ?? (config.mode === 'cloud' ? DEFAULT_CLOUD_URL : undefined),
  }
}
