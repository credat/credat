// verace — AI-native TypeScript SDK for eIDAS 2.0 verifiable credentials

export const VERSION = '0.1.0-alpha.0'

// Types
export type {
  JsonWebKey,
  CredentialFormat,
  CredentialClaims,
  CredentialSchema,
  ClaimDefinition,
  IssuanceRequest,
  IssuedCredential,
  VerificationRequest,
  VerificationResult,
  VerificationError,
  TrustChainInfo,
  DIDMethod,
  DIDDocument,
  DIDResolutionResult,
  DIDCreateOptions,
  AIGeneratedSchema,
  ClientConfig,
  AIConfig,
  VeraceClient,
} from './types'

// Errors
export {
  VeraceError,
  CredentialError,
  DIDError,
  ProtocolError,
  ErrorCodes,
} from './errors'

// Config
export { validateConfig } from './config'
