import type { DIDResolutionResult } from '../types'
import { DIDError, ErrorCodes } from '../errors'
import { resolveDidKey } from './methods/key'

export async function resolveDID(did: string): Promise<DIDResolutionResult> {
  const parts = did.split(':')
  if (parts.length < 3 || parts[0] !== 'did') {
    throw new DIDError(
      ErrorCodes.DID_RESOLUTION_FAILED,
      `Invalid DID format: ${did}`,
      `"${did}" is not a valid DID. A DID looks like "did:key:z..." or "did:web:example.com".`
    )
  }

  const method = parts[1]

  switch (method) {
    case 'key':
      return resolveDidKey(did)
    case 'web':
      throw new DIDError(ErrorCodes.DID_METHOD_UNSUPPORTED, 'did:web not yet implemented')
    case 'ebsi':
      throw new DIDError(ErrorCodes.DID_METHOD_UNSUPPORTED, 'did:ebsi not yet implemented')
    default:
      throw new DIDError(
        ErrorCodes.DID_METHOD_UNSUPPORTED,
        `Unsupported DID method: ${method}`,
        `The DID method "${method}" is not supported. Supported methods: key, web, ebsi.`
      )
  }
}
