import type {
  ClientConfig,
  CredatClient,
  IssuanceRequest,
  IssuedCredential,
  VerificationRequest,
  VerificationResult,
  DIDCreateOptions,
  DIDResolutionResult,
  AIGeneratedSchema,
  CredentialSchema,
  VerificationError,
  AIConfig,
} from './types'
import { validateConfig } from './config'
import { CredatError, ErrorCodes } from './errors'
import { generateKeyPair } from './crypto/keys'
import { uint8ArrayToBase64url, base64urlToUint8Array, jwkToPublicKey } from './crypto/keys'
import { createDidKey } from './did/methods/key'
import { createDidWeb } from './did/methods/web'
import { resolveDID } from './did/resolver'
import { createSdJwtVc, verifySdJwtVc } from './credentials/formats/sd-jwt-vc'
import { createMdoc, verifyMdoc } from './credentials/formats/mdoc'
import { isIssuerTrusted } from './trust/trust-list'
import { generateSchema } from './ai/schema-generator'
import { explainError } from './ai/error-explainer'
import { generateTestFixtures } from './ai/test-fixtures'

export function createClient(config: ClientConfig): CredatClient {
  const validated = validateConfig(config)

  if (validated.mode === 'cloud') {
    throw new CredatError(
      ErrorCodes.INVALID_CONFIG,
      'Cloud mode is not yet available',
      'Cloud mode is coming soon. Use local mode for now: createClient({ mode: "local" })',
    )
  }

  return createLocalClient(validated)
}

function createLocalClient(config: ClientConfig): CredatClient {
  const keyPair = generateKeyPair('ES256')
  const issuerDid = createDidKey(keyPair.publicKey, 'ES256')

  return {
    credentials: createCredentialsModule(keyPair.privateKey, keyPair.publicKey, issuerDid),
    did: createDIDModule(),
    ai: createAIModule(config.ai, keyPair.privateKey, keyPair.publicKey, issuerDid),
  }
}

// === Credentials Module ===

function createCredentialsModule(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  issuerDid: string,
) {
  return {
    async issue(request: IssuanceRequest): Promise<IssuedCredential> {
      const format = request.format ?? 'sd-jwt-vc'
      const credentialId = `urn:uuid:${crypto.randomUUID()}`
      const now = new Date()

      if (format === 'sd-jwt-vc') {
        const raw = await createSdJwtVc({
          issuerPrivateKey: privateKey,
          issuerPublicKey: publicKey,
          issuerDid,
          type: request.type,
          claims: request.claims,
          selectiveDisclosure: request.selectiveDisclosure ?? [],
          holderDid: request.holder,
          expiresAt: request.expiresAt,
        })

        return {
          id: credentialId,
          format: 'sd-jwt-vc',
          raw,
          type: request.type,
          issuer: issuerDid,
          holder: request.holder,
          issuedAt: now,
          expiresAt: request.expiresAt,
          claims: request.claims,
        }
      }

      // mDoc
      const mdocBytes = await createMdoc({
        issuerPrivateKey: privateKey,
        issuerPublicKey: publicKey,
        issuerDid,
        docType: request.type,
        nameSpace: `org.iso.18013.5.1.${request.type}`,
        claims: request.claims,
        expiresAt: request.expiresAt,
      })

      return {
        id: credentialId,
        format: 'mdoc',
        raw: uint8ArrayToBase64url(new Uint8Array(mdocBytes)),
        type: request.type,
        issuer: issuerDid,
        holder: request.holder,
        issuedAt: now,
        expiresAt: request.expiresAt,
        claims: request.claims,
      }
    },

    async verify(request: VerificationRequest): Promise<VerificationResult> {
      // SD-JWT VCs contain '~' as a disclosure separator. This character is not in the
      // base64url alphabet (A-Za-z0-9-_), so it cannot appear in base64url-encoded mDocs.
      const isSdJwt = request.credential.includes('~')

      if (isSdJwt) {
        return verifySdJwtCredential(request, publicKey)
      }

      return verifyMdocCredential(request, publicKey)
    },
  }
}

async function verifySdJwtCredential(
  request: VerificationRequest,
  fallbackPublicKey: Uint8Array,
): Promise<VerificationResult> {
  // Try to resolve issuer key from the credential itself
  const issuerPublicKey = (await resolveIssuerKeyFromSdJwt(request.credential)) ?? fallbackPublicKey

  const result = await verifySdJwtVc(request.credential, issuerPublicKey)

  const errors: VerificationError[] = []

  if (!result.valid && result.errors) {
    for (const e of result.errors) {
      errors.push({ code: ErrorCodes.SIGNATURE_INVALID, message: e })
    }
  }

  // Check expiry
  if (result.valid && result.expiresAt && result.expiresAt < new Date()) {
    errors.push({ code: ErrorCodes.EXPIRED, message: 'Credential has expired' })
  }

  // Check required claims
  if (request.requiredClaims) {
    const missing = request.requiredClaims.filter((c) => !(c in result.claims))
    if (missing.length > 0) {
      errors.push({
        code: ErrorCodes.MISSING_REQUIRED_CLAIMS,
        message: `Missing required claims: ${missing.join(', ')}`,
      })
    }
  }

  // Check trust list
  let trustChain
  if (request.trustList) {
    trustChain = await isIssuerTrusted(result.issuer, request.trustList, request.trustedIssuers)
    if (!trustChain.issuerTrusted) {
      errors.push({
        code: ErrorCodes.ISSUER_UNTRUSTED,
        message: `Issuer ${result.issuer} is not trusted`,
      })
    }
  }

  return {
    valid: result.valid && errors.length === 0,
    claims: result.claims,
    issuer: result.issuer,
    format: 'sd-jwt-vc',
    issuedAt: result.issuedAt,
    expiresAt: result.expiresAt,
    errors: errors.length > 0 ? errors : undefined,
    trustChain,
  }
}

async function verifyMdocCredential(
  request: VerificationRequest,
  fallbackPublicKey: Uint8Array,
): Promise<VerificationResult> {
  const mdocBytes = base64urlToUint8Array(request.credential)
  const result = await verifyMdoc(mdocBytes, fallbackPublicKey)

  const errors: VerificationError[] = []

  if (!result.valid && result.errors) {
    for (const e of result.errors) {
      errors.push({ code: ErrorCodes.SIGNATURE_INVALID, message: e })
    }
  }

  if (result.valid && result.expiresAt && result.expiresAt < new Date()) {
    errors.push({ code: ErrorCodes.EXPIRED, message: 'Credential has expired' })
  }

  if (request.requiredClaims) {
    const missing = request.requiredClaims.filter((c) => !(c in result.claims))
    if (missing.length > 0) {
      errors.push({
        code: ErrorCodes.MISSING_REQUIRED_CLAIMS,
        message: `Missing required claims: ${missing.join(', ')}`,
      })
    }
  }

  return {
    valid: result.valid && errors.length === 0,
    claims: result.claims,
    issuer: result.issuer,
    format: 'mdoc',
    issuedAt: result.issuedAt,
    expiresAt: result.expiresAt,
    errors: errors.length > 0 ? errors : undefined,
  }
}

async function resolveIssuerKeyFromSdJwt(sdJwt: string): Promise<Uint8Array | null> {
  try {
    const jwt = sdJwt.split('~')[0]!
    const payloadB64 = jwt.split('.')[1]!
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
    ) as { iss?: string }

    if (!payload.iss) return null

    const resolution = await resolveDID(payload.iss)
    const jwk = resolution.didDocument?.verificationMethod?.[0]?.publicKeyJwk
    if (!jwk) return null

    return jwkToPublicKey(jwk)
  } catch {
    return null
  }
}

// === DID Module ===

function createDIDModule() {
  return {
    async create(options: DIDCreateOptions): Promise<string> {
      switch (options.method) {
        case 'key': {
          const kp = generateKeyPair('ES256')
          return createDidKey(kp.publicKey, 'ES256')
        }
        case 'web': {
          if (!options.domain) {
            throw new CredatError(
              ErrorCodes.INVALID_CONFIG,
              'Domain is required for did:web',
              'Provide a domain: client.did.create({ method: "web", domain: "example.com" })',
            )
          }
          return createDidWeb(options.domain)
        }
        default:
          throw new CredatError(
            ErrorCodes.INVALID_CONFIG,
            `DID method "${options.method}" cannot be created locally. Supported: key, web.`,
          )
      }
    },

    resolve(did: string): Promise<DIDResolutionResult> {
      return resolveDID(did)
    },
  }
}

// === AI Module ===

function createAIModule(
  aiConfig: AIConfig | undefined,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  issuerDid: string,
) {
  const requireAI = (): AIConfig => {
    if (!aiConfig) {
      throw new CredatError(
        ErrorCodes.INVALID_CONFIG,
        'AI features require configuration',
        'Enable AI: createClient({ mode: "local", ai: { provider: "anthropic", apiKey: "sk-..." } })',
      )
    }
    return aiConfig
  }

  return {
    async generateSchema(description: string): Promise<AIGeneratedSchema> {
      return generateSchema(requireAI(), description)
    },

    async generateTestFixtures(
      schema: CredentialSchema,
      options?: { count?: number },
    ): Promise<IssuedCredential[]> {
      const count = options?.count ?? 5
      const claimsArray = await generateTestFixtures(requireAI(), schema, count)

      // Issue real signed credentials from the generated mock data
      const credentials: IssuedCredential[] = []

      for (const claims of claimsArray) {
        const format = schema.format
        const sdClaims = Object.entries(schema.claims)
          .filter(([, def]) => def.selectiveDisclosure)
          .map(([name]) => name)

        if (format === 'sd-jwt-vc') {
          const raw = await createSdJwtVc({
            issuerPrivateKey: privateKey,
            issuerPublicKey: publicKey,
            issuerDid,
            type: schema.type,
            claims,
            selectiveDisclosure: sdClaims,
          })

          credentials.push({
            id: `urn:uuid:${crypto.randomUUID()}`,
            format: 'sd-jwt-vc',
            raw,
            type: schema.type,
            issuer: issuerDid,
            issuedAt: new Date(),
            claims,
          })
        } else {
          const mdocBytes = await createMdoc({
            issuerPrivateKey: privateKey,
            issuerPublicKey: publicKey,
            issuerDid,
            docType: schema.type,
            nameSpace: `org.iso.18013.5.1.${schema.type}`,
            claims,
          })

          credentials.push({
            id: `urn:uuid:${crypto.randomUUID()}`,
            format: 'mdoc',
            raw: uint8ArrayToBase64url(new Uint8Array(mdocBytes)),
            type: schema.type,
            issuer: issuerDid,
            issuedAt: new Date(),
            claims,
          })
        }
      }

      return credentials
    },

    async explainError(error: VerificationError): Promise<string> {
      return explainError(requireAI(), error)
    },
  }
}
