import type { CredentialFormat, CredentialClaims } from '../../types'

// OpenID4VP types
// Ref: OpenID4VP draft-21

export interface PresentationDefinition {
  id: string
  input_descriptors: InputDescriptor[]
}

export interface InputDescriptor {
  id: string
  name?: string
  purpose?: string
  format?: {
    'vc+sd-jwt'?: { alg: string[] }
    mso_mdoc?: { alg: string[] }
  }
  constraints: {
    fields: FieldConstraint[]
  }
}

export interface FieldConstraint {
  path: string[] // JSONPath expressions, e.g. ["$.credentialSubject.givenName"]
  filter?: {
    type: string
    const?: unknown
  }
}

export interface AuthorizationRequest {
  response_type: 'vp_token'
  client_id: string
  redirect_uri: string
  nonce: string
  state: string
  presentation_definition: PresentationDefinition
}

export interface AuthorizationResponse {
  vp_token: string // SD-JWT presentation or base64url mDoc
  presentation_submission: PresentationSubmission
  state: string
}

export interface PresentationSubmission {
  id: string
  definition_id: string
  descriptor_map: Array<{
    id: string
    format: 'vc+sd-jwt' | 'mso_mdoc'
    path: string // e.g. "$"
  }>
}

export interface VerifiedPresentation {
  valid: boolean
  format: CredentialFormat
  claims: CredentialClaims
  issuer: string
  issuedAt: Date
  expiresAt?: Date
  errors?: string[]
  requestedClaimsPresent: boolean
}

// Builder types

export interface PresentationRequestParams {
  credentialType: string
  requiredClaims: string[]
  format?: CredentialFormat
  purpose?: string
}

export interface PendingRequest {
  nonce: string
  state: string
  params: PresentationRequestParams
  createdAt: Date
  expiresAt: Date
}
