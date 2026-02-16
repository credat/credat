# SSI Developer SDK v0.1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship an AI-native TypeScript SDK to npm that lets fintech developers issue and verify eIDAS 2.0 verifiable credentials in 10 lines of code.

**Architecture:** Single npm package (`@<name>/sdk`) with batteries-included monolith design. Local mode for dev (in-memory storage, file-based keys), cloud mode for production (API key → hosted backend). AI features (schema generation, error explanation) use pluggable LLM adapters. Protocols: OpenID4VCI (issuance) + OpenID4VP (verification). Formats: SD-JWT VC + mDoc. DID methods: did:key + did:web + did:ebsi.

**Tech Stack:** TypeScript (strict), Node.js 20+, Vitest, tsup (ESM+CJS), @noble/curves + @noble/hashes (crypto), better-sqlite3 (local storage), undici (HTTP).

**Design doc:** `docs/plans/2026-02-16-ssi-sdk-pivot-design.md`

**Working name:** `verace` (placeholder — find-and-replace when final name chosen)

---

## Task Overview

| # | Task | Estimated Time | Dependencies |
|---|------|---------------|-------------|
| 1 | Project scaffolding | 30 min | None |
| 2 | Core types & config | 45 min | Task 1 |
| 3 | Crypto utilities | 1 hr | Task 2 |
| 4 | DID resolution (did:key) | 1 hr | Task 3 |
| 5 | DID resolution (did:web + did:ebsi) | 1.5 hr | Task 4 |
| 6 | SD-JWT VC encoding/decoding | 2 hr | Task 3 |
| 7 | mDoc (CBOR) encoding/decoding | 2 hr | Task 3 |
| 8 | Storage adapters (memory + SQLite) | 1 hr | Task 2 |
| 9 | Local key management | 1 hr | Task 3, 8 |
| 10 | OpenID4VCI — credential issuance | 3 hr | Task 6, 7, 9 |
| 11 | OpenID4VP — credential verification | 3 hr | Task 6, 7, 4 |
| 12 | Trust list basics | 1.5 hr | Task 4 |
| 13 | AI — schema generator | 1.5 hr | Task 2 |
| 14 | AI — error explainer + test fixtures | 1 hr | Task 13 |
| 15 | Client entry point (createClient) | 2 hr | Tasks 10-14 |
| 16 | Cloud mode adapter (stub) | 1 hr | Task 15 |
| 17 | Examples (Next.js KYC, Express API) | 2 hr | Task 15 |
| 18 | README + docs site scaffold | 1.5 hr | Task 17 |
| 19 | Build, lint, CI setup | 1 hr | Task 15 |
| 20 | npm publish preparation | 30 min | Task 19 |

**Total estimated:** ~26 hours of focused implementation (~2-3 weeks with daily sessions)

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.npmignore`
- Create: `src/index.ts` (empty barrel export)

**Step 1: Initialize git repo and npm project**

```bash
cd /Users/samsepiol/Downloads/GithubRepos/Work/Autre/SSI-SAAS
git init
```

**Step 2: Create package.json**

```json
{
  "name": "verace",
  "version": "0.1.0-alpha.0",
  "description": "AI-native TypeScript SDK for eIDAS 2.0 verifiable credentials",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "biome check src/",
    "lint:fix": "biome check --write src/",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "eidas",
    "verifiable-credentials",
    "ssi",
    "sd-jwt",
    "openid4vc",
    "openid4vci",
    "openid4vp",
    "mdoc",
    "did",
    "identity",
    "typescript"
  ],
  "author": "Maxime Mansiet",
  "license": "Apache-2.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 3: Install dependencies**

```bash
# Core dependencies
npm install @noble/curves @noble/hashes undici cbor-x

# Dev dependencies
npm install -D typescript tsup vitest @biomejs/biome @types/node
```

Note: `better-sqlite3` added in Task 8. `cbor-x` is for mDoc CBOR encoding.

**Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 5: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  sourcemap: true,
  minify: false,
})
```

**Step 6: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
})
```

**Step 7: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.env
.env.local
coverage/
.DS_Store
```

**Step 8: Create src/index.ts (empty barrel)**

```typescript
// verace — AI-native TypeScript SDK for eIDAS 2.0 verifiable credentials
// https://github.com/<org>/verace

export const VERSION = '0.1.0-alpha.0'
```

**Step 9: Verify build works**

Run: `npx tsc --noEmit && npx tsup`
Expected: Build succeeds, `dist/` created with `index.js`, `index.cjs`, `index.d.ts`

**Step 10: Verify tests work**

Run: `npx vitest run`
Expected: 0 tests found, no errors

**Step 11: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore src/index.ts
git commit -m "chore: scaffold SDK project with TypeScript, tsup, vitest"
```

---

## Task 2: Core Types & Config

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `src/errors.ts`
- Create: `src/errors.test.ts`
- Modify: `src/index.ts`

**Step 1: Write the core types**

Create `src/types.ts`:

```typescript
// === Credential Types ===

export type CredentialFormat = 'sd-jwt-vc' | 'mdoc'

export interface CredentialClaims {
  [key: string]: string | number | boolean | null | CredentialClaims
}

export interface CredentialSchema {
  type: string
  description?: string
  claims: Record<string, ClaimDefinition>
  format: CredentialFormat
}

export interface ClaimDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object'
  required?: boolean
  description?: string
  selectiveDisclosure?: boolean
}

export interface IssuanceRequest {
  type: string
  claims: CredentialClaims
  format?: CredentialFormat
  selectiveDisclosure?: string[]
  holder?: string // DID of the holder
  expiresAt?: Date
}

export interface IssuedCredential {
  id: string
  format: CredentialFormat
  raw: string // Encoded credential (SD-JWT or CBOR)
  type: string
  issuer: string // Issuer DID
  holder?: string
  issuedAt: Date
  expiresAt?: Date
  claims: CredentialClaims
}

export interface VerificationRequest {
  credential: string // Raw encoded credential
  requiredClaims?: string[]
  trustList?: 'eu' | 'custom'
  trustedIssuers?: string[]
}

export interface VerificationResult {
  valid: boolean
  claims: CredentialClaims
  issuer: string
  format: CredentialFormat
  issuedAt: Date
  expiresAt?: Date
  errors?: VerificationError[]
  trustChain?: TrustChainInfo
}

export interface VerificationError {
  code: string
  message: string
  humanMessage?: string // AI-generated explanation
}

export interface TrustChainInfo {
  issuerTrusted: boolean
  trustListSource?: string
  verifiedAt: Date
}

// === DID Types ===

export type DIDMethod = 'key' | 'web' | 'ebsi'

export interface DIDDocument {
  id: string
  verificationMethod?: VerificationMethod[]
  authentication?: string[]
  assertionMethod?: string[]
  service?: ServiceEndpoint[]
}

export interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyJwk?: JsonWebKey
  publicKeyMultibase?: string
}

export interface ServiceEndpoint {
  id: string
  type: string
  serviceEndpoint: string
}

export interface DIDCreateOptions {
  method: DIDMethod
  domain?: string // Required for did:web
}

export interface DIDResolutionResult {
  didDocument: DIDDocument | null
  didResolutionMetadata: { error?: string }
  didDocumentMetadata: Record<string, unknown>
}

// === AI Types ===

export interface AIGeneratedSchema extends CredentialSchema {
  confidence: number // 0-1
  suggestions?: string[]
  eidasCompliance?: {
    compliant: boolean
    warnings: string[]
    missingClaims?: string[]
  }
}

// === Client Types ===

export interface ClientConfig {
  mode: 'local' | 'cloud'
  apiKey?: string
  baseUrl?: string
  ai?: AIConfig
}

export interface AIConfig {
  provider: 'anthropic' | 'openai' | 'custom'
  apiKey?: string
  model?: string
  baseUrl?: string
}

export interface VeraceClient {
  credentials: {
    issue: (request: IssuanceRequest) => Promise<IssuedCredential>
    verify: (request: VerificationRequest) => Promise<VerificationResult>
  }
  did: {
    create: (options: DIDCreateOptions) => Promise<string>
    resolve: (did: string) => Promise<DIDResolutionResult>
  }
  ai: {
    generateSchema: (description: string) => Promise<AIGeneratedSchema>
    generateTestFixtures: (schema: CredentialSchema, options?: { count?: number }) => Promise<IssuedCredential[]>
    explainError: (error: VerificationError) => Promise<string>
  }
}
```

**Step 2: Write error classes**

Create `src/errors.ts`:

```typescript
export class VeraceError extends Error {
  public readonly code: string
  public readonly humanMessage?: string

  constructor(code: string, message: string, humanMessage?: string) {
    super(message)
    this.name = 'VeraceError'
    this.code = code
    this.humanMessage = humanMessage
  }
}

export class CredentialError extends VeraceError {
  constructor(code: string, message: string, humanMessage?: string) {
    super(code, message, humanMessage)
    this.name = 'CredentialError'
  }
}

export class DIDError extends VeraceError {
  constructor(code: string, message: string, humanMessage?: string) {
    super(code, message, humanMessage)
    this.name = 'DIDError'
  }
}

export class ProtocolError extends VeraceError {
  constructor(code: string, message: string, humanMessage?: string) {
    super(code, message, humanMessage)
    this.name = 'ProtocolError'
  }
}

// Error codes
export const ErrorCodes = {
  // Credential errors
  INVALID_CLAIMS: 'CREDENTIAL_INVALID_CLAIMS',
  INVALID_FORMAT: 'CREDENTIAL_INVALID_FORMAT',
  EXPIRED: 'CREDENTIAL_EXPIRED',
  SIGNATURE_INVALID: 'CREDENTIAL_SIGNATURE_INVALID',
  ISSUER_UNTRUSTED: 'CREDENTIAL_ISSUER_UNTRUSTED',
  MISSING_REQUIRED_CLAIMS: 'CREDENTIAL_MISSING_REQUIRED_CLAIMS',

  // DID errors
  DID_NOT_FOUND: 'DID_NOT_FOUND',
  DID_METHOD_UNSUPPORTED: 'DID_METHOD_UNSUPPORTED',
  DID_RESOLUTION_FAILED: 'DID_RESOLUTION_FAILED',

  // Protocol errors
  OPENID4VCI_FAILED: 'OPENID4VCI_FAILED',
  OPENID4VP_FAILED: 'OPENID4VP_FAILED',

  // Config errors
  MISSING_API_KEY: 'CONFIG_MISSING_API_KEY',
  INVALID_CONFIG: 'CONFIG_INVALID',
} as const
```

**Step 3: Write tests for errors**

Create `src/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { VeraceError, CredentialError, DIDError, ErrorCodes } from './errors'

describe('VeraceError', () => {
  it('creates error with code and message', () => {
    const err = new VeraceError('TEST_CODE', 'test message')
    expect(err.code).toBe('TEST_CODE')
    expect(err.message).toBe('test message')
    expect(err.name).toBe('VeraceError')
    expect(err).toBeInstanceOf(Error)
  })

  it('includes human-readable message when provided', () => {
    const err = new VeraceError('TEST', 'technical msg', 'Human-friendly explanation')
    expect(err.humanMessage).toBe('Human-friendly explanation')
  })
})

describe('CredentialError', () => {
  it('is a VeraceError', () => {
    const err = new CredentialError(ErrorCodes.EXPIRED, 'credential expired')
    expect(err).toBeInstanceOf(VeraceError)
    expect(err.name).toBe('CredentialError')
  })
})

describe('DIDError', () => {
  it('is a VeraceError', () => {
    const err = new DIDError(ErrorCodes.DID_NOT_FOUND, 'not found')
    expect(err).toBeInstanceOf(VeraceError)
    expect(err.name).toBe('DIDError')
  })
})
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: 4 tests pass

**Step 5: Write config**

Create `src/config.ts`:

```typescript
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
```

**Step 6: Update barrel export**

Update `src/index.ts`:

```typescript
// verace — AI-native TypeScript SDK for eIDAS 2.0 verifiable credentials

export const VERSION = '0.1.0-alpha.0'

// Types
export type {
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
```

**Step 7: Run tests + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All pass

**Step 8: Commit**

```bash
git add src/types.ts src/config.ts src/errors.ts src/errors.test.ts src/index.ts
git commit -m "feat: add core types, config, and error classes"
```

---

## Task 3: Crypto Utilities

**Files:**
- Create: `src/crypto/keys.ts`
- Create: `src/crypto/sign.ts`
- Create: `src/crypto/verify.ts`
- Create: `src/crypto/index.ts`
- Create: `src/crypto/keys.test.ts`
- Create: `src/crypto/sign.test.ts`

**Context:** All crypto uses `@noble/curves` (ES256 = P-256 for eIDAS, EdDSA = Ed25519 for general). No native dependencies. Pure JavaScript. These are the building blocks for credential signing and DID key management.

**Step 1: Write key generation tests**

Create `src/crypto/keys.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateKeyPair, publicKeyToJwk, jwkToPublicKey } from './keys'

describe('generateKeyPair', () => {
  it('generates ES256 (P-256) key pair', () => {
    const kp = generateKeyPair('ES256')
    expect(kp.algorithm).toBe('ES256')
    expect(kp.privateKey).toBeInstanceOf(Uint8Array)
    expect(kp.publicKey).toBeInstanceOf(Uint8Array)
    expect(kp.privateKey.length).toBe(32)
    expect(kp.publicKey.length).toBe(33) // compressed
  })

  it('generates EdDSA (Ed25519) key pair', () => {
    const kp = generateKeyPair('EdDSA')
    expect(kp.algorithm).toBe('EdDSA')
    expect(kp.privateKey.length).toBe(32)
    expect(kp.publicKey.length).toBe(32)
  })

  it('generates unique keys each time', () => {
    const kp1 = generateKeyPair('ES256')
    const kp2 = generateKeyPair('ES256')
    expect(kp1.privateKey).not.toEqual(kp2.privateKey)
  })
})

describe('publicKeyToJwk', () => {
  it('converts P-256 public key to JWK', () => {
    const kp = generateKeyPair('ES256')
    const jwk = publicKeyToJwk(kp.publicKey, 'ES256')
    expect(jwk.kty).toBe('EC')
    expect(jwk.crv).toBe('P-256')
    expect(jwk.x).toBeDefined()
    expect(jwk.y).toBeDefined()
    expect(jwk.d).toBeUndefined() // No private key
  })

  it('converts Ed25519 public key to JWK', () => {
    const kp = generateKeyPair('EdDSA')
    const jwk = publicKeyToJwk(kp.publicKey, 'EdDSA')
    expect(jwk.kty).toBe('OKP')
    expect(jwk.crv).toBe('Ed25519')
    expect(jwk.x).toBeDefined()
  })

  it('round-trips through JWK', () => {
    const kp = generateKeyPair('ES256')
    const jwk = publicKeyToJwk(kp.publicKey, 'ES256')
    const restored = jwkToPublicKey(jwk)
    expect(restored).toEqual(kp.publicKey)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/crypto/keys.test.ts`
Expected: FAIL — module not found

**Step 3: Implement key generation**

Create `src/crypto/keys.ts`:

```typescript
import { p256 } from '@noble/curves/p256'
import { ed25519 } from '@noble/curves/ed25519'
import { randomBytes } from '@noble/hashes/utils'

export type Algorithm = 'ES256' | 'EdDSA'

export interface KeyPair {
  algorithm: Algorithm
  privateKey: Uint8Array
  publicKey: Uint8Array
}

export function generateKeyPair(algorithm: Algorithm): KeyPair {
  const privateKey = randomBytes(32)

  if (algorithm === 'ES256') {
    const publicKey = p256.getPublicKey(privateKey, true) // compressed
    return { algorithm, privateKey, publicKey }
  }

  if (algorithm === 'EdDSA') {
    const publicKey = ed25519.getPublicKey(privateKey)
    return { algorithm, privateKey, publicKey }
  }

  throw new Error(`Unsupported algorithm: ${algorithm}`)
}

export function publicKeyToJwk(publicKey: Uint8Array, algorithm: Algorithm): JsonWebKey {
  if (algorithm === 'ES256') {
    // Decompress P-256 public key to get x, y coordinates
    const point = p256.ProjectivePoint.fromHex(publicKey)
    const uncompressed = point.toRawBytes(false) // 65 bytes: 0x04 || x || y
    const x = uncompressed.slice(1, 33)
    const y = uncompressed.slice(33, 65)

    return {
      kty: 'EC',
      crv: 'P-256',
      x: uint8ArrayToBase64url(x),
      y: uint8ArrayToBase64url(y),
    }
  }

  if (algorithm === 'EdDSA') {
    return {
      kty: 'OKP',
      crv: 'Ed25519',
      x: uint8ArrayToBase64url(publicKey),
    }
  }

  throw new Error(`Unsupported algorithm: ${algorithm}`)
}

export function jwkToPublicKey(jwk: JsonWebKey): Uint8Array {
  if (jwk.kty === 'EC' && jwk.crv === 'P-256') {
    const x = base64urlToUint8Array(jwk.x!)
    const y = base64urlToUint8Array(jwk.y!)
    // Reconstruct uncompressed, then compress
    const uncompressed = new Uint8Array(65)
    uncompressed[0] = 0x04
    uncompressed.set(x, 1)
    uncompressed.set(y, 33)
    const point = p256.ProjectivePoint.fromHex(uncompressed)
    return point.toRawBytes(true) // compressed
  }

  if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519') {
    return base64urlToUint8Array(jwk.x!)
  }

  throw new Error(`Unsupported JWK: kty=${jwk.kty}, crv=${jwk.crv}`)
}

// Base64url helpers
export function uint8ArrayToBase64url(bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  return new Uint8Array(Buffer.from(base64, 'base64'))
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/crypto/keys.test.ts`
Expected: All 5 tests pass

**Step 5: Write signing tests**

Create `src/crypto/sign.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateKeyPair } from './keys'
import { sign, verifySignature } from './sign'

describe('sign and verify', () => {
  it('signs and verifies with ES256', () => {
    const kp = generateKeyPair('ES256')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp.privateKey, 'ES256')
    expect(signature).toBeInstanceOf(Uint8Array)
    expect(verifySignature(payload, signature, kp.publicKey, 'ES256')).toBe(true)
  })

  it('signs and verifies with EdDSA', () => {
    const kp = generateKeyPair('EdDSA')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp.privateKey, 'EdDSA')
    expect(verifySignature(payload, signature, kp.publicKey, 'EdDSA')).toBe(true)
  })

  it('rejects tampered payload', () => {
    const kp = generateKeyPair('ES256')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp.privateKey, 'ES256')
    const tampered = new TextEncoder().encode('hello tampered')
    expect(verifySignature(tampered, signature, kp.publicKey, 'ES256')).toBe(false)
  })

  it('rejects wrong public key', () => {
    const kp1 = generateKeyPair('ES256')
    const kp2 = generateKeyPair('ES256')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp1.privateKey, 'ES256')
    expect(verifySignature(payload, signature, kp2.publicKey, 'ES256')).toBe(false)
  })
})
```

**Step 6: Implement signing**

Create `src/crypto/sign.ts`:

```typescript
import { p256 } from '@noble/curves/p256'
import { ed25519 } from '@noble/curves/ed25519'
import type { Algorithm } from './keys'

export function sign(payload: Uint8Array, privateKey: Uint8Array, algorithm: Algorithm): Uint8Array {
  if (algorithm === 'ES256') {
    const sig = p256.sign(payload, privateKey, { lowS: true })
    return sig.toCompactRawBytes()
  }

  if (algorithm === 'EdDSA') {
    return ed25519.sign(payload, privateKey)
  }

  throw new Error(`Unsupported algorithm: ${algorithm}`)
}

export function verifySignature(
  payload: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
  algorithm: Algorithm,
): boolean {
  try {
    if (algorithm === 'ES256') {
      return p256.verify(signature, payload, publicKey, { lowS: true })
    }

    if (algorithm === 'EdDSA') {
      return ed25519.verify(signature, payload, publicKey)
    }

    return false
  } catch {
    return false
  }
}
```

**Step 7: Create barrel export**

Create `src/crypto/index.ts`:

```typescript
export { generateKeyPair, publicKeyToJwk, jwkToPublicKey, uint8ArrayToBase64url, base64urlToUint8Array } from './keys'
export type { Algorithm, KeyPair } from './keys'
export { sign, verifySignature } from './sign'
```

**Step 8: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (errors + crypto)

**Step 9: Commit**

```bash
git add src/crypto/
git commit -m "feat: add crypto utilities (key generation, signing, verification)"
```

---

## Task 4: DID Resolution — did:key

**Files:**
- Create: `src/did/resolver.ts`
- Create: `src/did/methods/key.ts`
- Create: `src/did/index.ts`
- Create: `src/did/methods/key.test.ts`

**Context:** `did:key` encodes a public key directly into the DID string. It's self-resolving (no network lookup needed). Format: `did:key:z<multibase-encoded-multicodec-public-key>`. We use multicodec prefix `0x1200` for P-256 and `0xed` for Ed25519.

**Step 1: Write did:key tests**

Create `src/did/methods/key.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateKeyPair } from '../../crypto'
import { createDidKey, resolveDidKey } from './key'

describe('did:key', () => {
  it('creates a did:key from P-256 public key', () => {
    const kp = generateKeyPair('ES256')
    const did = createDidKey(kp.publicKey, 'ES256')
    expect(did).toMatch(/^did:key:z/)
  })

  it('creates a did:key from Ed25519 public key', () => {
    const kp = generateKeyPair('EdDSA')
    const did = createDidKey(kp.publicKey, 'EdDSA')
    expect(did).toMatch(/^did:key:z/)
  })

  it('resolves a did:key to a DID document', () => {
    const kp = generateKeyPair('ES256')
    const did = createDidKey(kp.publicKey, 'ES256')
    const result = resolveDidKey(did)
    expect(result.didDocument).not.toBeNull()
    expect(result.didDocument!.id).toBe(did)
    expect(result.didDocument!.verificationMethod).toHaveLength(1)
    expect(result.didDocument!.verificationMethod![0].publicKeyJwk).toBeDefined()
  })

  it('round-trips: create → resolve → verify key matches', () => {
    const kp = generateKeyPair('ES256')
    const did = createDidKey(kp.publicKey, 'ES256')
    const result = resolveDidKey(did)
    const jwk = result.didDocument!.verificationMethod![0].publicKeyJwk!
    expect(jwk.crv).toBe('P-256')
    expect(jwk.x).toBeDefined()
    expect(jwk.y).toBeDefined()
  })

  it('returns error for invalid did:key', () => {
    const result = resolveDidKey('did:key:invalid')
    expect(result.didDocument).toBeNull()
    expect(result.didResolutionMetadata.error).toBeDefined()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/did/methods/key.test.ts`
Expected: FAIL

**Step 3: Implement did:key**

Create `src/did/methods/key.ts`:

```typescript
import type { Algorithm } from '../../crypto/keys'
import { publicKeyToJwk, uint8ArrayToBase64url, base64urlToUint8Array } from '../../crypto/keys'
import type { DIDDocument, DIDResolutionResult } from '../../types'

// Multicodec prefixes
const MULTICODEC_P256 = new Uint8Array([0x80, 0x24]) // varint for 0x1200
const MULTICODEC_ED25519 = new Uint8Array([0xed, 0x01]) // varint for 0xed

export function createDidKey(publicKey: Uint8Array, algorithm: Algorithm): string {
  const prefix = algorithm === 'ES256' ? MULTICODEC_P256 : MULTICODEC_ED25519
  const multicodecKey = new Uint8Array(prefix.length + publicKey.length)
  multicodecKey.set(prefix, 0)
  multicodecKey.set(publicKey, prefix.length)

  // Multibase base58btc encoding (prefix 'z')
  const encoded = base58btcEncode(multicodecKey)
  return `did:key:z${encoded}`
}

export function resolveDidKey(did: string): DIDResolutionResult {
  try {
    if (!did.startsWith('did:key:z')) {
      return {
        didDocument: null,
        didResolutionMetadata: { error: 'invalidDid' },
        didDocumentMetadata: {},
      }
    }

    const multibaseEncoded = did.slice('did:key:z'.length)
    const multicodecKey = base58btcDecode(multibaseEncoded)

    let algorithm: Algorithm
    let publicKey: Uint8Array

    // Check multicodec prefix
    if (multicodecKey[0] === 0x80 && multicodecKey[1] === 0x24) {
      algorithm = 'ES256'
      publicKey = multicodecKey.slice(2)
    } else if (multicodecKey[0] === 0xed && multicodecKey[1] === 0x01) {
      algorithm = 'EdDSA'
      publicKey = multicodecKey.slice(2)
    } else {
      return {
        didDocument: null,
        didResolutionMetadata: { error: 'unsupportedPublicKeyType' },
        didDocumentMetadata: {},
      }
    }

    const keyId = `${did}#${did.split(':')[2]}`
    const jwk = publicKeyToJwk(publicKey, algorithm)

    const verificationMethodType = algorithm === 'ES256' ? 'JsonWebKey2020' : 'JsonWebKey2020'

    const didDocument: DIDDocument = {
      id: did,
      verificationMethod: [
        {
          id: keyId,
          type: verificationMethodType,
          controller: did,
          publicKeyJwk: jwk,
        },
      ],
      authentication: [keyId],
      assertionMethod: [keyId],
    }

    return {
      didDocument,
      didResolutionMetadata: {},
      didDocumentMetadata: {},
    }
  } catch (error) {
    return {
      didDocument: null,
      didResolutionMetadata: { error: 'invalidDid' },
      didDocumentMetadata: {},
    }
  }
}

// Base58btc encoding/decoding (Bitcoin alphabet)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58btcEncode(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''

  // Count leading zeros
  let zeros = 0
  for (const b of bytes) {
    if (b !== 0) break
    zeros++
  }

  // Convert to big integer and divide
  const result: number[] = []
  let num = bytes.reduce((acc, b) => acc * 256n + BigInt(b), 0n)

  while (num > 0n) {
    const remainder = Number(num % 58n)
    result.unshift(remainder)
    num = num / 58n
  }

  // Add leading '1's for zero bytes
  const encoded = '1'.repeat(zeros) + result.map((i) => BASE58_ALPHABET[i]).join('')
  return encoded
}

function base58btcDecode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0)

  // Count leading '1's
  let zeros = 0
  for (const c of str) {
    if (c !== '1') break
    zeros++
  }

  // Convert from base58 to big integer
  let num = 0n
  for (const c of str) {
    const index = BASE58_ALPHABET.indexOf(c)
    if (index === -1) throw new Error(`Invalid base58 character: ${c}`)
    num = num * 58n + BigInt(index)
  }

  // Convert big integer to bytes
  const bytes: number[] = []
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn))
    num = num >> 8n
  }

  // Add leading zero bytes
  const result = new Uint8Array(zeros + bytes.length)
  result.set(new Uint8Array(bytes), zeros)
  return result
}
```

**Step 4: Create DID barrel and resolver**

Create `src/did/resolver.ts`:

```typescript
import type { DIDResolutionResult } from '../types'
import { DIDError, ErrorCodes } from '../errors'
import { resolveDidKey } from './methods/key'

export async function resolveDID(did: string): Promise<DIDResolutionResult> {
  const method = did.split(':')[1]

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
```

Create `src/did/index.ts`:

```typescript
export { resolveDID } from './resolver'
export { createDidKey, resolveDidKey } from './methods/key'
```

**Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/did/
git commit -m "feat: add did:key creation and resolution"
```

---

## Task 5: DID Resolution — did:web + did:ebsi

**Files:**
- Create: `src/did/methods/web.ts`
- Create: `src/did/methods/web.test.ts`
- Create: `src/did/methods/ebsi.ts`
- Create: `src/did/methods/ebsi.test.ts`
- Modify: `src/did/resolver.ts`
- Modify: `src/did/index.ts`

**Context:** `did:web` resolves by fetching `https://<domain>/.well-known/did.json`. `did:ebsi` resolves via the EBSI DID registry API. For v0.1 we implement did:web fully and did:ebsi as a basic resolver (GET from EBSI API).

**Step 1: Write did:web tests**

Create `src/did/methods/web.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { didWebToUrl, resolveDidWeb, createDidWeb } from './web'

describe('didWebToUrl', () => {
  it('converts did:web:example.com to https://example.com/.well-known/did.json', () => {
    expect(didWebToUrl('did:web:example.com')).toBe('https://example.com/.well-known/did.json')
  })

  it('converts did:web:example.com:path to https://example.com/path/did.json', () => {
    expect(didWebToUrl('did:web:example.com:user:123')).toBe('https://example.com/user/123/did.json')
  })

  it('handles port-encoded colons', () => {
    expect(didWebToUrl('did:web:example.com%3A8443')).toBe('https://example.com:8443/.well-known/did.json')
  })
})

describe('createDidWeb', () => {
  it('creates did:web from domain', () => {
    const did = createDidWeb('example.com')
    expect(did).toBe('did:web:example.com')
  })

  it('creates did:web with path', () => {
    const did = createDidWeb('example.com', 'users/123')
    expect(did).toBe('did:web:example.com:users:123')
  })
})

describe('resolveDidWeb', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves a valid did:web by fetching the URL', async () => {
    const mockDocument = {
      id: 'did:web:example.com',
      verificationMethod: [{
        id: 'did:web:example.com#key-1',
        type: 'JsonWebKey2020',
        controller: 'did:web:example.com',
        publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' },
      }],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument),
    }) as any

    const result = await resolveDidWeb('did:web:example.com')
    expect(result.didDocument).toEqual(mockDocument)
    expect(fetch).toHaveBeenCalledWith('https://example.com/.well-known/did.json')
  })

  it('returns error for HTTP failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any

    const result = await resolveDidWeb('did:web:notfound.com')
    expect(result.didDocument).toBeNull()
    expect(result.didResolutionMetadata.error).toBe('notFound')
  })
})
```

**Step 2: Implement did:web**

Create `src/did/methods/web.ts`:

```typescript
import type { DIDDocument, DIDResolutionResult } from '../../types'

export function didWebToUrl(did: string): string {
  const parts = did.replace('did:web:', '').split(':')
  const domain = decodeURIComponent(parts[0])

  if (parts.length === 1) {
    return `https://${domain}/.well-known/did.json`
  }

  const path = parts.slice(1).join('/')
  return `https://${domain}/${path}/did.json`
}

export function createDidWeb(domain: string, path?: string): string {
  if (path) {
    const encodedPath = path.replace(/\//g, ':')
    return `did:web:${domain}:${encodedPath}`
  }
  return `did:web:${domain}`
}

export async function resolveDidWeb(did: string): Promise<DIDResolutionResult> {
  try {
    const url = didWebToUrl(did)
    const response = await fetch(url)

    if (!response.ok) {
      return {
        didDocument: null,
        didResolutionMetadata: { error: 'notFound' },
        didDocumentMetadata: {},
      }
    }

    const didDocument = (await response.json()) as DIDDocument
    return {
      didDocument,
      didResolutionMetadata: {},
      didDocumentMetadata: {},
    }
  } catch (error) {
    return {
      didDocument: null,
      didResolutionMetadata: { error: 'notFound' },
      didDocumentMetadata: {},
    }
  }
}
```

**Step 3: Write did:ebsi tests**

Create `src/did/methods/ebsi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveDidEbsi } from './ebsi'

describe('resolveDidEbsi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves a valid did:ebsi via EBSI API', async () => {
    const mockDocument = {
      id: 'did:ebsi:z123abc',
      verificationMethod: [{
        id: 'did:ebsi:z123abc#key-1',
        type: 'JsonWebKey2020',
        controller: 'did:ebsi:z123abc',
        publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' },
      }],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument),
    }) as any

    const result = await resolveDidEbsi('did:ebsi:z123abc')
    expect(result.didDocument).toEqual(mockDocument)
  })

  it('returns error for unregistered DID', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any

    const result = await resolveDidEbsi('did:ebsi:zunknown')
    expect(result.didDocument).toBeNull()
    expect(result.didResolutionMetadata.error).toBeDefined()
  })
})
```

**Step 4: Implement did:ebsi**

Create `src/did/methods/ebsi.ts`:

```typescript
import type { DIDDocument, DIDResolutionResult } from '../../types'

const EBSI_DID_REGISTRY = 'https://api-pilot.ebsi.eu/did-registry/v5/identifiers'

export async function resolveDidEbsi(did: string): Promise<DIDResolutionResult> {
  try {
    const url = `${EBSI_DID_REGISTRY}/${encodeURIComponent(did)}`
    const response = await fetch(url)

    if (!response.ok) {
      return {
        didDocument: null,
        didResolutionMetadata: { error: 'notFound' },
        didDocumentMetadata: {},
      }
    }

    const didDocument = (await response.json()) as DIDDocument
    return {
      didDocument,
      didResolutionMetadata: {},
      didDocumentMetadata: {},
    }
  } catch (error) {
    return {
      didDocument: null,
      didResolutionMetadata: { error: 'notFound' },
      didDocumentMetadata: {},
    }
  }
}
```

**Step 5: Update resolver to include all methods**

Update `src/did/resolver.ts`:

```typescript
import type { DIDResolutionResult } from '../types'
import { DIDError, ErrorCodes } from '../errors'
import { resolveDidKey } from './methods/key'
import { resolveDidWeb } from './methods/web'
import { resolveDidEbsi } from './methods/ebsi'

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
      return resolveDidWeb(did)
    case 'ebsi':
      return resolveDidEbsi(did)
    default:
      throw new DIDError(
        ErrorCodes.DID_METHOD_UNSUPPORTED,
        `Unsupported DID method: ${method}`,
        `The DID method "${method}" is not supported. Supported methods: key, web, ebsi.`
      )
  }
}
```

**Step 6: Update barrel exports**

Update `src/did/index.ts`:

```typescript
export { resolveDID } from './resolver'
export { createDidKey, resolveDidKey } from './methods/key'
export { createDidWeb, resolveDidWeb, didWebToUrl } from './methods/web'
export { resolveDidEbsi } from './methods/ebsi'
```

**Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/did/
git commit -m "feat: add did:web and did:ebsi resolution"
```

---

## Task 6: SD-JWT VC Encoding/Decoding

**Files:**
- Create: `src/credentials/formats/sd-jwt-vc.ts`
- Create: `src/credentials/formats/sd-jwt-vc.test.ts`
- Create: `src/credentials/formats/index.ts`
- Create: `src/credentials/index.ts`

**Context:** SD-JWT VC (Selective Disclosure JWT Verifiable Credential) is the primary credential format mandated by eIDAS 2.0. An SD-JWT consists of: `<issuer-jwt>~<disclosure1>~<disclosure2>~...~<optional-holder-binding>`. Each disclosure is a base64url-encoded `[salt, claim_name, claim_value]` array. The holder can selectively present only certain disclosures. The JWT header uses `alg: ES256` and `typ: vc+sd-jwt`.

This is the most complex single component. Implementation should follow the IETF SD-JWT spec (draft-ietf-oauth-selective-disclosure-jwt).

**Step 1: Write SD-JWT VC tests**

Create `src/credentials/formats/sd-jwt-vc.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateKeyPair } from '../../crypto'
import { createSdJwtVc, verifySdJwtVc, presentSdJwtVc } from './sd-jwt-vc'

describe('SD-JWT VC', () => {
  const issuerKp = generateKeyPair('ES256')

  it('creates an SD-JWT VC with claims', async () => {
    const sdJwt = await createSdJwtVc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      type: 'KYCVerification',
      claims: {
        givenName: 'Alice',
        familyName: 'Dupont',
        dateOfBirth: '1990-01-15',
      },
      selectiveDisclosure: ['dateOfBirth'],
    })

    expect(sdJwt).toContain('~') // Has disclosures
    expect(sdJwt.split('~').length).toBeGreaterThanOrEqual(2) // JWT + at least 1 disclosure
  })

  it('verifies a valid SD-JWT VC', async () => {
    const sdJwt = await createSdJwtVc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      type: 'KYCVerification',
      claims: {
        givenName: 'Alice',
        familyName: 'Dupont',
      },
      selectiveDisclosure: [],
    })

    const result = await verifySdJwtVc(sdJwt, issuerKp.publicKey)
    expect(result.valid).toBe(true)
    expect(result.claims.givenName).toBe('Alice')
    expect(result.claims.familyName).toBe('Dupont')
  })

  it('supports selective disclosure', async () => {
    const sdJwt = await createSdJwtVc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      type: 'KYCVerification',
      claims: {
        givenName: 'Alice',
        familyName: 'Dupont',
        dateOfBirth: '1990-01-15',
        nationality: 'FR',
      },
      selectiveDisclosure: ['dateOfBirth', 'nationality'],
    })

    // Present only givenName and familyName (hide dateOfBirth and nationality)
    const presentation = presentSdJwtVc(sdJwt, ['givenName', 'familyName'])

    const result = await verifySdJwtVc(presentation, issuerKp.publicKey)
    expect(result.valid).toBe(true)
    expect(result.claims.givenName).toBe('Alice')
    expect(result.claims.familyName).toBe('Dupont')
    // Selectively disclosed claims should NOT be present
    expect(result.claims.dateOfBirth).toBeUndefined()
    expect(result.claims.nationality).toBeUndefined()
  })

  it('rejects tampered SD-JWT VC', async () => {
    const sdJwt = await createSdJwtVc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      type: 'Test',
      claims: { name: 'Alice' },
      selectiveDisclosure: [],
    })

    // Tamper with the JWT part
    const parts = sdJwt.split('~')
    parts[0] = parts[0].slice(0, -5) + 'XXXXX'
    const tampered = parts.join('~')

    const result = await verifySdJwtVc(tampered, issuerKp.publicKey)
    expect(result.valid).toBe(false)
  })

  it('rejects wrong issuer key', async () => {
    const wrongKp = generateKeyPair('ES256')

    const sdJwt = await createSdJwtVc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      type: 'Test',
      claims: { name: 'Alice' },
      selectiveDisclosure: [],
    })

    const result = await verifySdJwtVc(sdJwt, wrongKp.publicKey)
    expect(result.valid).toBe(false)
  })

  it('includes standard VC claims (iss, iat, vct)', async () => {
    const sdJwt = await createSdJwtVc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      type: 'KYCVerification',
      claims: { name: 'Alice' },
      selectiveDisclosure: [],
    })

    const result = await verifySdJwtVc(sdJwt, issuerKp.publicKey)
    expect(result.issuer).toBe('did:key:ztest')
    expect(result.issuedAt).toBeInstanceOf(Date)
    expect(result.format).toBe('sd-jwt-vc')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/credentials/formats/sd-jwt-vc.test.ts`
Expected: FAIL

**Step 3: Implement SD-JWT VC**

Create `src/credentials/formats/sd-jwt-vc.ts`:

```typescript
import { sha256 } from '@noble/hashes/sha256'
import { randomBytes } from '@noble/hashes/utils'
import { sign, verifySignature } from '../../crypto/sign'
import { publicKeyToJwk, uint8ArrayToBase64url, base64urlToUint8Array } from '../../crypto/keys'
import type { CredentialClaims } from '../../types'

export interface SdJwtVcCreateOptions {
  issuerPrivateKey: Uint8Array
  issuerPublicKey: Uint8Array
  issuerDid: string
  type: string
  claims: CredentialClaims
  selectiveDisclosure: string[]
  holderDid?: string
  expiresAt?: Date
}

export interface SdJwtVcVerifyResult {
  valid: boolean
  claims: CredentialClaims
  issuer: string
  format: 'sd-jwt-vc'
  issuedAt: Date
  expiresAt?: Date
  errors?: string[]
}

interface Disclosure {
  salt: string
  claimName: string
  claimValue: unknown
  encoded: string
  digest: string
}

// === CREATE ===

export async function createSdJwtVc(options: SdJwtVcCreateOptions): Promise<string> {
  const { issuerPrivateKey, issuerPublicKey, issuerDid, type, claims, selectiveDisclosure } = options

  // Create disclosures for SD claims
  const disclosures: Disclosure[] = []
  const sdDigests: string[] = []
  const plainClaims: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(claims)) {
    if (selectiveDisclosure.includes(key)) {
      const disclosure = createDisclosure(key, value)
      disclosures.push(disclosure)
      sdDigests.push(disclosure.digest)
    } else {
      plainClaims[key] = value
    }
  }

  // Build JWT payload
  const now = Math.floor(Date.now() / 1000)
  const payload: Record<string, unknown> = {
    iss: issuerDid,
    iat: now,
    vct: type, // Verifiable Credential Type (SD-JWT VC spec)
    ...plainClaims,
  }

  if (sdDigests.length > 0) {
    payload._sd = sdDigests
  }

  if (options.holderDid) {
    payload.sub = options.holderDid
  }

  if (options.expiresAt) {
    payload.exp = Math.floor(options.expiresAt.getTime() / 1000)
  }

  // Add _sd_alg
  payload._sd_alg = 'sha-256'

  // Build JWT header
  const header = {
    alg: 'ES256',
    typ: 'vc+sd-jwt',
    kid: `${issuerDid}#key-1`,
  }

  // Encode and sign JWT
  const headerB64 = jsonToBase64url(header)
  const payloadB64 = jsonToBase64url(payload)
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = sign(signingInput, issuerPrivateKey, 'ES256')
  const signatureB64 = uint8ArrayToBase64url(signature)

  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`

  // Combine: <jwt>~<disclosure1>~<disclosure2>~...~
  const disclosureParts = disclosures.map((d) => d.encoded)
  return [jwt, ...disclosureParts, ''].join('~')
}

// === VERIFY ===

export async function verifySdJwtVc(
  sdJwt: string,
  issuerPublicKey: Uint8Array,
): Promise<SdJwtVcVerifyResult> {
  try {
    const parts = sdJwt.split('~')
    const jwt = parts[0]
    const disclosureStrings = parts.slice(1).filter((d) => d.length > 0)

    // Parse JWT
    const jwtParts = jwt.split('.')
    if (jwtParts.length !== 3) {
      return { valid: false, claims: {}, issuer: '', format: 'sd-jwt-vc', issuedAt: new Date(), errors: ['Invalid JWT format'] }
    }

    const header = base64urlToJson(jwtParts[0])
    const payload = base64urlToJson(jwtParts[1])
    const signatureBytes = base64urlToUint8Array(jwtParts[2])

    // Verify signature
    const signingInput = new TextEncoder().encode(`${jwtParts[0]}.${jwtParts[1]}`)
    const signatureValid = verifySignature(signingInput, signatureBytes, issuerPublicKey, 'ES256')

    if (!signatureValid) {
      return { valid: false, claims: {}, issuer: '', format: 'sd-jwt-vc', issuedAt: new Date(), errors: ['Invalid signature'] }
    }

    // Process disclosures
    const claims: CredentialClaims = {}
    const sdDigests = (payload._sd as string[]) ?? []

    // Add plain claims (everything except reserved fields)
    const reserved = ['iss', 'iat', 'exp', 'vct', 'sub', '_sd', '_sd_alg', 'cnf']
    for (const [key, value] of Object.entries(payload)) {
      if (!reserved.includes(key)) {
        claims[key] = value as string | number | boolean
      }
    }

    // Process each disclosure
    for (const disclosureStr of disclosureStrings) {
      const disclosureJson = JSON.parse(new TextDecoder().decode(base64urlToUint8Array(disclosureStr)))
      const [_salt, claimName, claimValue] = disclosureJson

      // Verify disclosure digest is in _sd array
      const digest = computeDisclosureDigest(disclosureStr)
      if (sdDigests.includes(digest)) {
        claims[claimName as string] = claimValue
      }
    }

    return {
      valid: true,
      claims,
      issuer: payload.iss as string,
      format: 'sd-jwt-vc',
      issuedAt: new Date((payload.iat as number) * 1000),
      expiresAt: payload.exp ? new Date((payload.exp as number) * 1000) : undefined,
    }
  } catch (error) {
    return {
      valid: false,
      claims: {},
      issuer: '',
      format: 'sd-jwt-vc',
      issuedAt: new Date(),
      errors: [(error as Error).message],
    }
  }
}

// === PRESENT (Selective Disclosure) ===

export function presentSdJwtVc(sdJwt: string, revealClaims: string[]): string {
  const parts = sdJwt.split('~')
  const jwt = parts[0]
  const disclosureStrings = parts.slice(1).filter((d) => d.length > 0)

  // Parse JWT payload to get plain claims
  const jwtParts = jwt.split('.')
  const payload = base64urlToJson(jwtParts[1])

  // Determine which plain claims are requested (always included)
  // Filter disclosures to only include those for requested claims
  const includedDisclosures: string[] = []

  for (const disclosureStr of disclosureStrings) {
    const disclosureJson = JSON.parse(new TextDecoder().decode(base64urlToUint8Array(disclosureStr)))
    const claimName = disclosureJson[1] as string

    if (revealClaims.includes(claimName)) {
      includedDisclosures.push(disclosureStr)
    }
  }

  return [jwt, ...includedDisclosures, ''].join('~')
}

// === Helpers ===

function createDisclosure(claimName: string, claimValue: unknown): Disclosure {
  const salt = uint8ArrayToBase64url(randomBytes(16))
  const disclosureArray = [salt, claimName, claimValue]
  const encoded = jsonToBase64url(disclosureArray)
  const digest = computeDisclosureDigest(encoded)

  return { salt, claimName, claimValue, encoded, digest }
}

function computeDisclosureDigest(encoded: string): string {
  const bytes = new TextEncoder().encode(encoded)
  const hash = sha256(bytes)
  return uint8ArrayToBase64url(hash)
}

function jsonToBase64url(obj: unknown): string {
  const json = JSON.stringify(obj)
  return uint8ArrayToBase64url(new TextEncoder().encode(json))
}

function base64urlToJson(str: string): Record<string, unknown> {
  const bytes = base64urlToUint8Array(str)
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json)
}
```

**Step 4: Create barrel exports**

Create `src/credentials/formats/index.ts`:

```typescript
export { createSdJwtVc, verifySdJwtVc, presentSdJwtVc } from './sd-jwt-vc'
export type { SdJwtVcCreateOptions, SdJwtVcVerifyResult } from './sd-jwt-vc'
```

Create `src/credentials/index.ts`:

```typescript
export { createSdJwtVc, verifySdJwtVc, presentSdJwtVc } from './formats'
export type { SdJwtVcCreateOptions, SdJwtVcVerifyResult } from './formats'
```

**Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass (including all 6 SD-JWT VC tests)

**Step 6: Commit**

```bash
git add src/credentials/
git commit -m "feat: add SD-JWT VC encoding, decoding, and selective disclosure"
```

---

## Task 7: mDoc (CBOR) Encoding/Decoding

**Files:**
- Create: `src/credentials/formats/mdoc.ts`
- Create: `src/credentials/formats/mdoc.test.ts`
- Modify: `src/credentials/formats/index.ts`

**Context:** mDoc (ISO 18013-5) uses CBOR encoding. For v0.1, implement a simplified version that can encode/decode mDoc structures and sign them with COSE. This is a baseline implementation — full ISO 18013-5 compliance comes in v0.2.

**Step 1: Write mDoc tests**

Create `src/credentials/formats/mdoc.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateKeyPair } from '../../crypto'
import { createMdoc, verifyMdoc } from './mdoc'

describe('mDoc', () => {
  const issuerKp = generateKeyPair('ES256')

  it('creates an mDoc with claims', async () => {
    const mdoc = await createMdoc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      docType: 'org.iso.18013.5.1.mDL',
      nameSpace: 'org.iso.18013.5.1',
      claims: {
        given_name: 'Alice',
        family_name: 'Dupont',
        birth_date: '1990-01-15',
      },
    })

    expect(mdoc).toBeInstanceOf(Uint8Array)
    expect(mdoc.length).toBeGreaterThan(0)
  })

  it('verifies a valid mDoc', async () => {
    const mdoc = await createMdoc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      docType: 'org.iso.18013.5.1.mDL',
      nameSpace: 'org.iso.18013.5.1',
      claims: {
        given_name: 'Alice',
        family_name: 'Dupont',
      },
    })

    const result = await verifyMdoc(mdoc, issuerKp.publicKey)
    expect(result.valid).toBe(true)
    expect(result.claims.given_name).toBe('Alice')
    expect(result.claims.family_name).toBe('Dupont')
  })

  it('rejects wrong issuer key', async () => {
    const wrongKp = generateKeyPair('ES256')

    const mdoc = await createMdoc({
      issuerPrivateKey: issuerKp.privateKey,
      issuerPublicKey: issuerKp.publicKey,
      issuerDid: 'did:key:ztest',
      docType: 'org.iso.18013.5.1.mDL',
      nameSpace: 'org.iso.18013.5.1',
      claims: { given_name: 'Alice' },
    })

    const result = await verifyMdoc(mdoc, wrongKp.publicKey)
    expect(result.valid).toBe(false)
  })
})
```

**Step 2: Implement mDoc (simplified CBOR/COSE)**

Create `src/credentials/formats/mdoc.ts`:

```typescript
import { encode, decode } from 'cbor-x'
import { sha256 } from '@noble/hashes/sha256'
import { sign, verifySignature } from '../../crypto/sign'
import type { CredentialClaims } from '../../types'

export interface MdocCreateOptions {
  issuerPrivateKey: Uint8Array
  issuerPublicKey: Uint8Array
  issuerDid: string
  docType: string
  nameSpace: string
  claims: CredentialClaims
  expiresAt?: Date
}

export interface MdocVerifyResult {
  valid: boolean
  claims: CredentialClaims
  issuer: string
  docType: string
  format: 'mdoc'
  issuedAt: Date
  expiresAt?: Date
  errors?: string[]
}

// Simplified COSE_Sign1 structure
// [protected, unprotected, payload, signature]

export async function createMdoc(options: MdocCreateOptions): Promise<Uint8Array> {
  const { issuerPrivateKey, issuerDid, docType, nameSpace, claims } = options

  // Build issuer-signed data
  const now = new Date()
  const issuerSignedData = {
    docType,
    nameSpace,
    claims,
    issuer: issuerDid,
    issuedAt: now.toISOString(),
    expiresAt: options.expiresAt?.toISOString(),
  }

  // COSE protected header: { alg: ES256 (= -7) }
  const protectedHeader = encode({ 1: -7 }) // 1 = alg, -7 = ES256

  // Payload as CBOR
  const payload = encode(issuerSignedData)

  // Create Sig_structure: ["Signature1", protectedHeader, externalAad, payload]
  const sigStructure = encode(['Signature1', protectedHeader, new Uint8Array(0), payload])

  // Hash and sign
  const digest = sha256(sigStructure)
  const signature = sign(digest, issuerPrivateKey, 'ES256')

  // COSE_Sign1: [protectedHeader, {}, payload, signature]
  const coseSign1 = encode([protectedHeader, {}, payload, signature])

  return coseSign1
}

export async function verifyMdoc(
  mdocBytes: Uint8Array,
  issuerPublicKey: Uint8Array,
): Promise<MdocVerifyResult> {
  try {
    // Decode COSE_Sign1
    const [protectedHeader, _unprotected, payload, signature] = decode(mdocBytes) as [
      Uint8Array,
      Record<string, unknown>,
      Uint8Array,
      Uint8Array,
    ]

    // Decode payload
    const issuerSignedData = decode(payload) as {
      docType: string
      nameSpace: string
      claims: CredentialClaims
      issuer: string
      issuedAt: string
      expiresAt?: string
    }

    // Reconstruct Sig_structure
    const sigStructure = encode(['Signature1', protectedHeader, new Uint8Array(0), payload])
    const digest = sha256(sigStructure)

    // Verify signature
    const valid = verifySignature(digest, signature, issuerPublicKey, 'ES256')

    if (!valid) {
      return {
        valid: false,
        claims: {},
        issuer: '',
        docType: '',
        format: 'mdoc',
        issuedAt: new Date(),
        errors: ['Invalid signature'],
      }
    }

    return {
      valid: true,
      claims: issuerSignedData.claims,
      issuer: issuerSignedData.issuer,
      docType: issuerSignedData.docType,
      format: 'mdoc',
      issuedAt: new Date(issuerSignedData.issuedAt),
      expiresAt: issuerSignedData.expiresAt ? new Date(issuerSignedData.expiresAt) : undefined,
    }
  } catch (error) {
    return {
      valid: false,
      claims: {},
      issuer: '',
      docType: '',
      format: 'mdoc',
      issuedAt: new Date(),
      errors: [(error as Error).message],
    }
  }
}
```

**Step 3: Update barrel exports**

Update `src/credentials/formats/index.ts` to add mDoc exports:

```typescript
export { createSdJwtVc, verifySdJwtVc, presentSdJwtVc } from './sd-jwt-vc'
export type { SdJwtVcCreateOptions, SdJwtVcVerifyResult } from './sd-jwt-vc'
export { createMdoc, verifyMdoc } from './mdoc'
export type { MdocCreateOptions, MdocVerifyResult } from './mdoc'
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/credentials/
git commit -m "feat: add mDoc (ISO 18013-5) CBOR encoding and verification"
```

---

## Task 8: Storage Adapters

**Files:**
- Create: `src/storage/types.ts`
- Create: `src/storage/memory.ts`
- Create: `src/storage/memory.test.ts`
- Create: `src/storage/index.ts`

**Context:** Pluggable storage for credentials and keys. In-memory for dev/testing. SQLite deferred to after core is working (listed in design but can come later in v0.1 cycle). Storage is simple key-value with type safety.

**Step 1: Write storage interface and tests**

Create `src/storage/types.ts`:

```typescript
export interface StorageAdapter {
  get<T>(collection: string, key: string): Promise<T | null>
  set<T>(collection: string, key: string, value: T): Promise<void>
  delete(collection: string, key: string): Promise<boolean>
  list<T>(collection: string): Promise<Array<{ key: string; value: T }>>
  clear(collection?: string): Promise<void>
}
```

Create `src/storage/memory.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage } from './memory'

describe('MemoryStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('stores and retrieves a value', async () => {
    await storage.set('creds', 'id-1', { type: 'KYC', name: 'Alice' })
    const result = await storage.get('creds', 'id-1')
    expect(result).toEqual({ type: 'KYC', name: 'Alice' })
  })

  it('returns null for missing key', async () => {
    const result = await storage.get('creds', 'nonexistent')
    expect(result).toBeNull()
  })

  it('deletes a value', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    const deleted = await storage.delete('creds', 'id-1')
    expect(deleted).toBe(true)
    expect(await storage.get('creds', 'id-1')).toBeNull()
  })

  it('returns false when deleting nonexistent key', async () => {
    const deleted = await storage.delete('creds', 'nonexistent')
    expect(deleted).toBe(false)
  })

  it('lists all items in a collection', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('creds', 'id-2', { name: 'Bob' })
    const items = await storage.list('creds')
    expect(items).toHaveLength(2)
  })

  it('isolates collections', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('keys', 'key-1', { algo: 'ES256' })
    expect(await storage.list('creds')).toHaveLength(1)
    expect(await storage.list('keys')).toHaveLength(1)
  })

  it('clears a specific collection', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('keys', 'key-1', { algo: 'ES256' })
    await storage.clear('creds')
    expect(await storage.list('creds')).toHaveLength(0)
    expect(await storage.list('keys')).toHaveLength(1)
  })

  it('clears all collections', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('keys', 'key-1', { algo: 'ES256' })
    await storage.clear()
    expect(await storage.list('creds')).toHaveLength(0)
    expect(await storage.list('keys')).toHaveLength(0)
  })
})
```

**Step 2: Implement MemoryStorage**

Create `src/storage/memory.ts`:

```typescript
import type { StorageAdapter } from './types'

export class MemoryStorage implements StorageAdapter {
  private store = new Map<string, Map<string, unknown>>()

  private getCollection(collection: string): Map<string, unknown> {
    let col = this.store.get(collection)
    if (!col) {
      col = new Map()
      this.store.set(collection, col)
    }
    return col
  }

  async get<T>(collection: string, key: string): Promise<T | null> {
    const col = this.getCollection(collection)
    const value = col.get(key)
    return (value as T) ?? null
  }

  async set<T>(collection: string, key: string, value: T): Promise<void> {
    this.getCollection(collection).set(key, value)
  }

  async delete(collection: string, key: string): Promise<boolean> {
    return this.getCollection(collection).delete(key)
  }

  async list<T>(collection: string): Promise<Array<{ key: string; value: T }>> {
    const col = this.getCollection(collection)
    return Array.from(col.entries()).map(([key, value]) => ({ key, value: value as T }))
  }

  async clear(collection?: string): Promise<void> {
    if (collection) {
      this.store.delete(collection)
    } else {
      this.store.clear()
    }
  }
}
```

Create `src/storage/index.ts`:

```typescript
export type { StorageAdapter } from './types'
export { MemoryStorage } from './memory'
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 4: Commit**

```bash
git add src/storage/
git commit -m "feat: add pluggable storage with in-memory adapter"
```

---

## Task 9: Local Key Management

**Files:**
- Create: `src/keys/local.ts`
- Create: `src/keys/local.test.ts`
- Create: `src/keys/types.ts`
- Create: `src/keys/index.ts`

**Context:** Local key management stores key pairs in the storage adapter. For local mode, keys are generated and stored in memory. The key manager provides methods to create, retrieve, and sign with keys.

**Step 1: Write key manager tests**

Create `src/keys/types.ts`:

```typescript
import type { Algorithm, KeyPair } from '../crypto'

export interface KeyManager {
  createKey(id: string, algorithm: Algorithm): Promise<StoredKey>
  getKey(id: string): Promise<StoredKey | null>
  sign(keyId: string, payload: Uint8Array): Promise<Uint8Array>
  listKeys(): Promise<StoredKey[]>
  deleteKey(id: string): Promise<boolean>
}

export interface StoredKey {
  id: string
  algorithm: Algorithm
  publicKey: Uint8Array
  createdAt: Date
}
```

Create `src/keys/local.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { LocalKeyManager } from './local'
import { MemoryStorage } from '../storage'
import { verifySignature } from '../crypto'

describe('LocalKeyManager', () => {
  let km: LocalKeyManager

  beforeEach(() => {
    km = new LocalKeyManager(new MemoryStorage())
  })

  it('creates an ES256 key', async () => {
    const key = await km.createKey('issuer-key', 'ES256')
    expect(key.id).toBe('issuer-key')
    expect(key.algorithm).toBe('ES256')
    expect(key.publicKey).toBeInstanceOf(Uint8Array)
  })

  it('retrieves a stored key', async () => {
    await km.createKey('my-key', 'ES256')
    const key = await km.getKey('my-key')
    expect(key).not.toBeNull()
    expect(key!.id).toBe('my-key')
  })

  it('returns null for unknown key', async () => {
    const key = await km.getKey('nonexistent')
    expect(key).toBeNull()
  })

  it('signs data with a stored key', async () => {
    const key = await km.createKey('sign-key', 'ES256')
    const payload = new TextEncoder().encode('test data')
    const signature = await km.sign('sign-key', payload)

    expect(signature).toBeInstanceOf(Uint8Array)
    expect(verifySignature(payload, signature, key.publicKey, 'ES256')).toBe(true)
  })

  it('lists all keys', async () => {
    await km.createKey('key-1', 'ES256')
    await km.createKey('key-2', 'EdDSA')
    const keys = await km.listKeys()
    expect(keys).toHaveLength(2)
  })

  it('deletes a key', async () => {
    await km.createKey('key-1', 'ES256')
    const deleted = await km.deleteKey('key-1')
    expect(deleted).toBe(true)
    expect(await km.getKey('key-1')).toBeNull()
  })
})
```

**Step 2: Implement LocalKeyManager**

Create `src/keys/local.ts`:

```typescript
import type { StorageAdapter } from '../storage'
import type { KeyManager, StoredKey } from './types'
import type { Algorithm } from '../crypto'
import { generateKeyPair, sign as cryptoSign } from '../crypto'
import { VeraceError, ErrorCodes } from '../errors'

interface StoredKeyInternal {
  id: string
  algorithm: Algorithm
  privateKey: string // hex-encoded for storage
  publicKey: string // hex-encoded for storage
  createdAt: string
}

const KEYS_COLLECTION = 'keys'

export class LocalKeyManager implements KeyManager {
  constructor(private storage: StorageAdapter) {}

  async createKey(id: string, algorithm: Algorithm): Promise<StoredKey> {
    const kp = generateKeyPair(algorithm)
    const now = new Date()

    const stored: StoredKeyInternal = {
      id,
      algorithm,
      privateKey: Buffer.from(kp.privateKey).toString('hex'),
      publicKey: Buffer.from(kp.publicKey).toString('hex'),
      createdAt: now.toISOString(),
    }

    await this.storage.set(KEYS_COLLECTION, id, stored)

    return {
      id,
      algorithm,
      publicKey: kp.publicKey,
      createdAt: now,
    }
  }

  async getKey(id: string): Promise<StoredKey | null> {
    const stored = await this.storage.get<StoredKeyInternal>(KEYS_COLLECTION, id)
    if (!stored) return null

    return {
      id: stored.id,
      algorithm: stored.algorithm,
      publicKey: Buffer.from(stored.publicKey, 'hex'),
      createdAt: new Date(stored.createdAt),
    }
  }

  async sign(keyId: string, payload: Uint8Array): Promise<Uint8Array> {
    const stored = await this.storage.get<StoredKeyInternal>(KEYS_COLLECTION, keyId)
    if (!stored) {
      throw new VeraceError(ErrorCodes.DID_NOT_FOUND, `Key not found: ${keyId}`)
    }

    const privateKey = Buffer.from(stored.privateKey, 'hex')
    return cryptoSign(payload, new Uint8Array(privateKey), stored.algorithm)
  }

  async listKeys(): Promise<StoredKey[]> {
    const items = await this.storage.list<StoredKeyInternal>(KEYS_COLLECTION)
    return items.map(({ value }) => ({
      id: value.id,
      algorithm: value.algorithm,
      publicKey: Buffer.from(value.publicKey, 'hex'),
      createdAt: new Date(value.createdAt),
    }))
  }

  async deleteKey(id: string): Promise<boolean> {
    return this.storage.delete(KEYS_COLLECTION, id)
  }
}
```

Create `src/keys/index.ts`:

```typescript
export type { KeyManager, StoredKey } from './types'
export { LocalKeyManager } from './local'
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 4: Commit**

```bash
git add src/keys/
git commit -m "feat: add local key management with storage adapter"
```

---

## Tasks 10-20: Remaining Implementation

**Due to plan length, the remaining tasks are described at a higher level. Each follows the same TDD pattern: write test → verify fail → implement → verify pass → commit.**

---

### Task 10: OpenID4VCI — Credential Issuance

**Files:**
- Create: `src/protocols/openid4vci/issuer.ts`
- Create: `src/protocols/openid4vci/types.ts`
- Create: `src/protocols/openid4vci/issuer.test.ts`
- Create: `src/protocols/openid4vci/index.ts`

**What to implement:**
- `CredentialIssuer` class that handles the OpenID4VCI issuance flow
- Credential offer creation (pre-authorized code flow for simplicity in v0.1)
- Credential endpoint that signs and returns SD-JWT VC or mDoc
- Token endpoint for the authorization server side
- Metadata endpoint (`.well-known/openid-credential-issuer`)

**Key test cases:**
1. Create credential offer → returns offer URI
2. Exchange pre-authorized code → returns access token
3. Request credential with access token → returns signed SD-JWT VC
4. Request credential in mDoc format → returns signed mDoc
5. Reject expired access token
6. Reject invalid credential type

**Commit:** `feat: add OpenID4VCI credential issuance protocol`

---

### Task 11: OpenID4VP — Credential Verification

**Files:**
- Create: `src/protocols/openid4vp/verifier.ts`
- Create: `src/protocols/openid4vp/types.ts`
- Create: `src/protocols/openid4vp/verifier.test.ts`
- Create: `src/protocols/openid4vp/index.ts`

**What to implement:**
- `CredentialVerifier` class that handles the OpenID4VP presentation flow
- Authorization request creation (request specific claims from wallet)
- Presentation definition builder (which credentials and claims to request)
- Response processing (parse VP token, verify credential, extract claims)
- Same-device and cross-device flows (URL-based)

**Key test cases:**
1. Create authorization request → returns request URI
2. Build presentation definition → specifies required claims
3. Process VP token → extracts and verifies claims
4. Reject expired credentials
5. Reject untrusted issuer
6. Handle selective disclosure (only requested claims returned)

**Commit:** `feat: add OpenID4VP credential verification protocol`

---

### Task 12: Trust List Basics

**Files:**
- Create: `src/trust/trust-list.ts`
- Create: `src/trust/trust-list.test.ts`
- Create: `src/trust/index.ts`

**What to implement:**
- Static trust list (hardcoded list of known EUDIW issuers for v0.1)
- Trust list interface for pluggable trust sources
- `isIssuerTrusted(issuerDid, trustList)` function
- Basic EU trust list structure (TLv6 format awareness)

**Key test cases:**
1. Known issuer → trusted
2. Unknown issuer → untrusted
3. Custom trust list → uses provided issuers
4. Empty trust list → all untrusted

**Commit:** `feat: add basic trust list verification`

---

### Task 13: AI — Schema Generator

**Files:**
- Create: `src/ai/schema-generator.ts`
- Create: `src/ai/schema-generator.test.ts`
- Create: `src/ai/types.ts`
- Create: `src/ai/index.ts`

**What to implement:**
- `generateSchema(description: string, config: AIConfig)` function
- Structured LLM prompt that generates typed CredentialSchema from natural language
- Parses LLM response into validated schema object
- Includes eIDAS compliance hints in the response
- Works with Anthropic Claude and OpenAI (pluggable provider)
- Mock provider for testing (no real API calls in tests)

**Key test cases (using mock LLM):**
1. "KYC verification for French banks" → schema with givenName, familyName, dateOfBirth, verificationLevel
2. Generated schema has correct types for each claim
3. SD claims are suggested for sensitive fields (dateOfBirth)
4. eIDAS compliance hints are included
5. Handles LLM errors gracefully

**Commit:** `feat: add AI-powered schema generation from natural language`

---

### Task 14: AI — Error Explainer + Test Fixtures

**Files:**
- Create: `src/ai/error-explainer.ts`
- Create: `src/ai/test-fixtures.ts`
- Create: `src/ai/error-explainer.test.ts`
- Create: `src/ai/test-fixtures.test.ts`

**What to implement:**
- `explainError(error: VerificationError, config: AIConfig)` → human-readable explanation
- `generateTestFixtures(schema: CredentialSchema, count: number)` → realistic mock credentials
- Test fixture generation uses schema types to create realistic data (no LLM needed for basic version — use faker-like patterns)
- Error explainer uses LLM to translate technical errors into human guidance

**Key test cases:**
1. CREDENTIAL_EXPIRED → "This credential was issued on X and expired on Y. The issuer needs to reissue it."
2. Generate 5 test fixtures → all match schema types
3. Generated fixtures have unique, realistic data
4. Error explainer works with mock LLM

**Commit:** `feat: add AI error explainer and test fixture generator`

---

### Task 15: Client Entry Point (createClient)

**Files:**
- Create: `src/client.ts`
- Create: `src/client.test.ts`
- Modify: `src/index.ts` (add createClient export)

**What to implement:**
- `createClient(config: ClientConfig)` → VeraceClient
- Wires together all components (credentials, DID, AI, storage, keys)
- Local mode: uses MemoryStorage + LocalKeyManager
- Cloud mode: validates API key, stubs cloud adapters
- Main developer-facing API surface

**Key test cases:**
1. `createClient({ mode: 'local' })` → returns client with all methods
2. Client can issue credential → returns IssuedCredential
3. Client can verify credential → returns VerificationResult
4. Client can create DID → returns DID string
5. Client can resolve DID → returns DIDDocument
6. Client can generate schema (with mock AI) → returns AIGeneratedSchema
7. Cloud mode without API key → throws VeraceError
8. Full round-trip: create client → issue credential → verify credential → valid

**Commit:** `feat: add createClient() entry point with full API surface`

---

### Task 16: Cloud Mode Adapter (Stub)

**Files:**
- Create: `src/cloud/adapter.ts`
- Create: `src/cloud/adapter.test.ts`
- Create: `src/cloud/index.ts`

**What to implement:**
- `CloudAdapter` class that proxies operations to cloud API
- For v0.1: stub implementation that throws "cloud mode not yet available" for operations requiring cloud
- API key validation against cloud endpoint
- Cloud storage adapter (implements StorageAdapter, calls cloud API)

**Commit:** `feat: add cloud mode adapter stub`

---

### Task 17: Examples

**Files:**
- Create: `examples/nextjs-kyc/README.md` (instructions only, no full Next.js app)
- Create: `examples/express-api/index.ts`
- Create: `examples/basic-issuance/index.ts`
- Create: `examples/basic-verification/index.ts`

**What to implement:**
- `basic-issuance`: 15-line script that creates a client, generates a schema, and issues a credential
- `basic-verification`: 15-line script that verifies a credential
- `express-api`: Minimal Express server with `/issue` and `/verify` endpoints
- `nextjs-kyc`: README describing how to integrate into a Next.js KYC flow (no full app yet)

**Commit:** `docs: add SDK usage examples`

---

### Task 18: README + Docs Site Scaffold

**Files:**
- Create: `README.md`
- Create: `docs/getting-started.md`
- Create: `docs/api-reference.md`
- Create: `LICENSE`

**What to implement:**
- README with: badges, one-liner, installation, quick start (10 lines), features list, comparison with Credo, links to docs
- Getting started guide with step-by-step walkthrough
- API reference (generated from TypeScript types + manual descriptions)
- Apache 2.0 LICENSE file

**Commit:** `docs: add README, getting started guide, and API reference`

---

### Task 19: Build, Lint, CI Setup

**Files:**
- Create: `biome.json`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (verify all scripts work)

**What to implement:**
- Biome config for linting and formatting
- GitHub Actions CI: test, typecheck, lint, build on Node 20 + 22
- Verify `npm run build` produces correct output
- Verify `npm run test` passes all tests
- Verify `npm run typecheck` passes

**Commit:** `chore: add biome config and GitHub Actions CI`

---

### Task 20: npm Publish Preparation

**Files:**
- Modify: `package.json` (verify fields: name, version, files, exports, repository)
- Create: `.npmignore`
- Verify: `npm pack --dry-run` shows correct files

**What to implement:**
- Verify package.json has all required npm fields
- Verify `.npmignore` excludes tests, examples, docs source
- Dry-run pack to check bundle size and contents
- Add `repository`, `bugs`, `homepage` fields to package.json
- Verify dual ESM/CJS build works with `npm pack`

**Commit:** `chore: prepare for npm publish`

**Then:** `npm publish --access public --tag alpha`

---

## Post-v0.1 Backlog (Not in this plan)

These items are tracked but NOT part of this implementation plan:

- [ ] CLI tool (`npx verace init`)
- [ ] SQLite storage adapter
- [ ] Cloud backend implementation (server-side)
- [ ] DIDComm support
- [ ] Holder wallet SDK
- [ ] React Native support
- [ ] Trust list auto-sync from EU registries
- [ ] Revocation registry (StatusList2021)
- [ ] Full ISO 18013-5 mDoc compliance
- [ ] Multi-tenancy
- [ ] Enterprise features (SSO, audit logs)
- [ ] AI agent identity demo
- [ ] Docs site (Fumadocs/Starlight deployment)
- [ ] Conference testing with EUDIW reference wallet

---

**Plan Completion Date:** 2026-02-16
**Estimated Implementation Time:** ~26 hours (~2-3 weeks with daily sessions)
**Design Doc Reference:** `docs/plans/2026-02-16-ssi-sdk-pivot-design.md`
