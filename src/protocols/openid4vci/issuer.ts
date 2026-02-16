import { randomBytes, bytesToHex } from '@noble/hashes/utils.js'
import { ProtocolError, ErrorCodes } from '../../errors'
import { createSdJwtVc } from '../../credentials/formats/sd-jwt-vc'
import { createMdoc } from '../../credentials/formats/mdoc'
import { uint8ArrayToBase64url } from '../../crypto/keys'
import type { CredentialFormat, IssuedCredential } from '../../types'
import type {
  CredentialOffer,
  CredentialOfferParams,
  CredentialResponse,
  IssuerMetadata,
  PendingOffer,
  IssuedToken,
  TokenResponse,
} from './types'

export interface CredentialIssuerConfig {
  issuerUrl: string
  issuerDid: string
  signingKeyId: string
  privateKey: Uint8Array
  publicKey: Uint8Array
  supportedFormats?: CredentialFormat[]
  tokenExpirySeconds?: number
  offerExpirySeconds?: number
}

const DEFAULT_TOKEN_EXPIRY = 300 // 5 minutes
const DEFAULT_OFFER_EXPIRY = 600 // 10 minutes

export class CredentialIssuer {
  private pendingOffers = new Map<string, PendingOffer>()
  private issuedTokens = new Map<string, IssuedToken>()
  private config: CredentialIssuerConfig

  constructor(config: CredentialIssuerConfig) {
    this.config = {
      ...config,
      supportedFormats: config.supportedFormats ?? ['sd-jwt-vc', 'mdoc'],
      tokenExpirySeconds: config.tokenExpirySeconds ?? DEFAULT_TOKEN_EXPIRY,
      offerExpirySeconds: config.offerExpirySeconds ?? DEFAULT_OFFER_EXPIRY,
    }
  }

  // === Credential Offer ===

  createOffer(params: CredentialOfferParams): { offer: CredentialOffer; offerUri: string } {
    const preAuthorizedCode = generateRandomToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.config.offerExpirySeconds! * 1000)

    this.pendingOffers.set(preAuthorizedCode, {
      preAuthorizedCode,
      params,
      createdAt: now,
      expiresAt,
    })

    const offer: CredentialOffer = {
      credential_issuer: this.config.issuerUrl,
      credential_configuration_ids: [params.credentialType],
      grants: {
        'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
          'pre-authorized_code': preAuthorizedCode,
        },
      },
    }

    const offerUri = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(offer))}`

    return { offer, offerUri }
  }

  // === Token Endpoint ===

  exchangePreAuthorizedCode(preAuthorizedCode: string): TokenResponse {
    const pending = this.pendingOffers.get(preAuthorizedCode)

    if (!pending) {
      throw new ProtocolError(
        ErrorCodes.OPENID4VCI_FAILED,
        'Invalid or unknown pre-authorized code',
        'The credential offer code is invalid or has already been used.',
      )
    }

    if (new Date() >= pending.expiresAt) {
      this.pendingOffers.delete(preAuthorizedCode)
      throw new ProtocolError(
        ErrorCodes.OPENID4VCI_FAILED,
        'Pre-authorized code has expired',
        'The credential offer has expired. Please request a new one.',
      )
    }

    // Consume the offer (single use)
    this.pendingOffers.delete(preAuthorizedCode)

    const accessToken = generateRandomToken()
    const nonce = generateRandomToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.config.tokenExpirySeconds! * 1000)

    this.issuedTokens.set(accessToken, {
      accessToken,
      preAuthorizedCode,
      params: pending.params,
      createdAt: now,
      expiresAt,
      nonce,
    })

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.config.tokenExpirySeconds!,
      c_nonce: nonce,
      c_nonce_expires_in: this.config.tokenExpirySeconds!,
    }
  }

  // === Credential Endpoint ===

  async issueCredential(
    accessToken: string,
    requestedFormat?: 'vc+sd-jwt' | 'mso_mdoc',
  ): Promise<{ response: CredentialResponse; credential: IssuedCredential }> {
    const token = this.issuedTokens.get(accessToken)

    if (!token) {
      throw new ProtocolError(
        ErrorCodes.OPENID4VCI_FAILED,
        'Invalid or unknown access token',
        'The access token is invalid or has already been used.',
      )
    }

    if (new Date() >= token.expiresAt) {
      this.issuedTokens.delete(accessToken)
      throw new ProtocolError(
        ErrorCodes.OPENID4VCI_FAILED,
        'Access token has expired',
        'The access token has expired. Please restart the issuance flow.',
      )
    }

    // Consume the token (single use)
    this.issuedTokens.delete(accessToken)

    const { params } = token
    const format = resolveFormat(requestedFormat, params.format)

    this.validateFormat(format)

    const credentialId = generateCredentialId()
    const now = new Date()

    if (format === 'sd-jwt-vc') {
      const raw = await createSdJwtVc({
        issuerPrivateKey: this.config.privateKey,
        issuerPublicKey: this.config.publicKey,
        issuerDid: this.config.issuerDid,
        type: params.credentialType,
        claims: params.claims,
        selectiveDisclosure: params.selectiveDisclosure ?? [],
        holderDid: params.holderDid,
        expiresAt: params.expiresAt,
      })

      const credential: IssuedCredential = {
        id: credentialId,
        format: 'sd-jwt-vc',
        raw,
        type: params.credentialType,
        issuer: this.config.issuerDid,
        holder: params.holderDid,
        issuedAt: now,
        expiresAt: params.expiresAt,
        claims: params.claims,
      }

      const response: CredentialResponse = {
        format: 'vc+sd-jwt',
        credential: raw,
      }

      return { response, credential }
    }

    // mDoc format
    const mdocBytes = await createMdoc({
      issuerPrivateKey: this.config.privateKey,
      issuerPublicKey: this.config.publicKey,
      issuerDid: this.config.issuerDid,
      docType: params.credentialType,
      nameSpace: `org.iso.18013.5.1.${params.credentialType}`,
      claims: params.claims,
      expiresAt: params.expiresAt,
    })

    // Ensure clean byte copy — cbor-x encode() may return a pooled Buffer slice
    const raw = uint8ArrayToBase64url(new Uint8Array(mdocBytes))

    const credential: IssuedCredential = {
      id: credentialId,
      format: 'mdoc',
      raw,
      type: params.credentialType,
      issuer: this.config.issuerDid,
      holder: params.holderDid,
      issuedAt: now,
      expiresAt: params.expiresAt,
      claims: params.claims,
    }

    const response: CredentialResponse = {
      format: 'mso_mdoc',
      credential: raw,
    }

    return { response, credential }
  }

  // === Metadata Endpoint ===

  getMetadata(): IssuerMetadata {
    const configurations: IssuerMetadata['credential_configurations_supported'] = {}

    if (this.config.supportedFormats!.includes('sd-jwt-vc')) {
      configurations['sd-jwt-vc'] = {
        format: 'vc+sd-jwt',
        credential_definition: {
          type: ['VerifiableCredential'],
        },
      }
    }

    if (this.config.supportedFormats!.includes('mdoc')) {
      configurations['mdoc'] = {
        format: 'mso_mdoc',
        doctype: 'org.iso.18013.5.1',
      }
    }

    return {
      credential_issuer: this.config.issuerUrl,
      credential_endpoint: `${this.config.issuerUrl}/credential`,
      token_endpoint: `${this.config.issuerUrl}/token`,
      credential_configurations_supported: configurations,
    }
  }

  private validateFormat(format: CredentialFormat): void {
    if (!this.config.supportedFormats!.includes(format)) {
      throw new ProtocolError(
        ErrorCodes.OPENID4VCI_FAILED,
        `Unsupported credential format: ${format}`,
        `The format "${format}" is not supported. Supported: ${this.config.supportedFormats!.join(', ')}`,
      )
    }
  }
}

// === Helpers ===

function generateRandomToken(): string {
  return bytesToHex(randomBytes(32))
}

function generateCredentialId(): string {
  return `urn:uuid:${crypto.randomUUID()}`
}

function resolveFormat(
  requested?: 'vc+sd-jwt' | 'mso_mdoc',
  fallback?: CredentialFormat,
): CredentialFormat {
  if (requested === 'vc+sd-jwt') return 'sd-jwt-vc'
  if (requested === 'mso_mdoc') return 'mdoc'
  return fallback ?? 'sd-jwt-vc'
}
