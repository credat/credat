import type { ClientConfig } from './types'
import { CredatError, ErrorCodes } from './errors'

const DEFAULT_CLOUD_URL = 'https://api.credat.io'

export function validateConfig(config: ClientConfig): ClientConfig {
  if (config.mode === 'cloud' && !config.apiKey) {
    throw new CredatError(
      ErrorCodes.MISSING_API_KEY,
      'API key is required for cloud mode',
      'You need an API key to use cloud mode. Get one at https://credat.io/dashboard'
    )
  }

  return {
    ...config,
    baseUrl: config.baseUrl ?? (config.mode === 'cloud' ? DEFAULT_CLOUD_URL : undefined),
  }
}
