// credat — AI-native TypeScript SDK for eIDAS 2.0 verifiable credentials

export const VERSION = '0.1.0-alpha.0'

// === Main Entry Point ===
export { createClient } from './client'

// === Types ===
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
  CredatClient,
} from './types'

// === Errors ===
export {
  CredatError,
  CredentialError,
  DIDError,
  ProtocolError,
  ErrorCodes,
} from './errors'

// === Config ===
export { validateConfig } from './config'

// === Crypto (advanced) ===
export { generateKeyPair, publicKeyToJwk, jwkToPublicKey } from './crypto'
export type { Algorithm, KeyPair } from './crypto'

// === DID (advanced) ===
export { resolveDID } from './did'
export { createDidKey, resolveDidKey } from './did'
export { createDidWeb, resolveDidWeb } from './did'

// === Credentials (advanced) ===
export { createSdJwtVc, verifySdJwtVc, presentSdJwtVc } from './credentials'
export { createMdoc, verifyMdoc } from './credentials'

// === Trust (advanced) ===
export { EuTrustList, CustomTrustList, isIssuerTrusted } from './trust'

// === Storage (advanced) ===
export { MemoryStorage } from './storage'
export type { StorageAdapter } from './storage'

// === Keys (advanced) ===
export { LocalKeyManager } from './keys'
export type { KeyManager, StoredKey } from './keys'

// === Protocols (advanced) ===
export { CredentialIssuer } from './protocols/openid4vci/issuer'
export { CredentialVerifier } from './protocols/openid4vp/verifier'
