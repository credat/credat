// === JSON Web Key (subset needed for DID operations) ===

export interface JsonWebKey {
	kty: string;
	crv?: string;
	x?: string;
	y?: string;
	d?: string;
	kid?: string;
	alg?: string;
	use?: string;
}

// === Credential Types ===

export type CredentialFormat = "sd-jwt-vc";

export interface CredentialClaims {
	[key: string]: string | number | boolean | null | CredentialClaims;
}

export interface CredentialSchema {
	type: string;
	description?: string;
	claims: Record<string, ClaimDefinition>;
	format: CredentialFormat;
}

export interface ClaimDefinition {
	type: "string" | "number" | "boolean" | "date" | "object";
	required?: boolean;
	description?: string;
	selectiveDisclosure?: boolean;
}

export interface IssuanceRequest {
	type: string;
	claims: CredentialClaims;
	format?: CredentialFormat;
	selectiveDisclosure?: string[];
	holder?: string; // DID of the holder
	expiresAt?: Date;
	statusListEntry?: StatusListEntry;
}

export interface IssuedCredential {
	id: string;
	format: CredentialFormat;
	raw: string; // Encoded credential (SD-JWT)
	type: string;
	issuer: string; // Issuer DID
	holder?: string;
	issuedAt: Date;
	expiresAt?: Date;
	claims: CredentialClaims;
	statusListEntry?: StatusListEntry;
}

export interface VerificationRequest {
	credential: string; // Raw encoded credential
	requiredClaims?: string[];
	trustList?: "eu" | "custom";
	trustedIssuers?: string[];
	checkRevocation?: boolean;
	statusList?: StatusListData;
}

export interface VerificationResult {
	valid: boolean;
	claims: CredentialClaims;
	issuer: string;
	format: CredentialFormat;
	issuedAt: Date;
	expiresAt?: Date;
	errors?: VerificationError[];
	trustChain?: TrustChainInfo;
	revocationStatus?: RevocationStatus;
}

export interface VerificationError {
	code: string;
	message: string;
	humanMessage?: string; // AI-generated explanation
}

export interface TrustChainInfo {
	issuerTrusted: boolean;
	trustListSource?: string;
	verifiedAt: Date;
}

// === DID Types ===

export type DIDMethod = "key" | "web" | "jwk";

export interface DIDDocument {
	id: string;
	verificationMethod?: VerificationMethod[];
	authentication?: string[];
	assertionMethod?: string[];
	service?: ServiceEndpoint[];
}

export interface VerificationMethod {
	id: string;
	type: string;
	controller: string;
	publicKeyJwk?: JsonWebKey; // Uses local JsonWebKey, not DOM
	publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
	id: string;
	type: string;
	serviceEndpoint: string;
}

export interface DIDCreateOptions {
	method: DIDMethod;
	domain?: string; // Required for did:web
}

export interface DIDResolutionResult {
	didDocument: DIDDocument | null;
	didResolutionMetadata: { error?: string };
	didDocumentMetadata: Record<string, unknown>;
}

// === Status List Types ===

export interface StatusListEntry {
	statusListUrl: string;
	statusListIndex: number;
}

export interface StatusListData {
	bitstring: Uint8Array;
	issuer: string;
	id: string;
	size: number;
}

export type RevocationStatus = "valid" | "revoked" | "unknown";

// === Agent Identity ===

export interface AgentConfig {
	domain: string;
	path?: string;
	algorithm?: "ES256" | "EdDSA" | "ES256K";
	storage?: import("./storage/types").StorageAdapter;
}

export interface AgentIdentity {
	did: string;
	didDocument: DIDDocument;
	keyPair: {
		algorithm: string;
		publicKey: Uint8Array;
		privateKey: Uint8Array;
	};
	algorithm: string;
	domain: string;
	path?: string;
}

// === Delegation ===

export interface DelegateOptions {
	agent: string;
	owner: string;
	ownerKeyPair: {
		algorithm: string;
		publicKey: Uint8Array;
		privateKey: Uint8Array;
	};
	scopes: string[];
	constraints?: DelegationConstraints;
	validFrom?: string;
	validUntil?: string;
	statusListUrl?: string;
	statusListIndex?: number;
}

export interface DelegationConstraints {
	maxTransactionValue?: number;
	validUntil?: string;
	allowedDomains?: string[];
	rateLimit?: number;
	[key: string]: unknown;
}

export interface DelegationCredential {
	raw: string;
	claims: DelegationClaims;
}

export interface DelegationClaims {
	agent: string;
	owner: string;
	scopes: string[];
	constraints?: DelegationConstraints;
	validFrom?: string;
	validUntil?: string;
}

export interface DelegationVerifyOptions {
	checkRevocation?: boolean;
	statusListUrl?: string;
}

export interface DelegationResult {
	valid: boolean;
	agent: string;
	owner: string;
	scopes: string[];
	constraints?: DelegationConstraints;
	validFrom?: string;
	validUntil?: string;
	errors: VerificationError[];
}

// === Handshake Protocol ===

export interface ChallengeMessage {
	type: "credat:challenge";
	nonce: string;
	from: string;
	timestamp: string;
}

export interface PresentationMessage {
	type: "credat:presentation";
	delegation: string;
	nonce: string;
	proof: string;
	from: string;
}

export interface AckMessage {
	type: "credat:ack";
	verified: boolean;
	scopes?: string[];
	counterChallenge?: ChallengeMessage;
	delegation?: string;
	proof?: string;
	from?: string;
}

export type HandshakeMessage =
	| ChallengeMessage
	| PresentationMessage
	| AckMessage;
