import type { Algorithm, KeyPair } from "./crypto/keys";
import type { ErrorCode } from "./errors";

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

export type CredentialClaimValue =
	| string
	| number
	| boolean
	| null
	| CredentialClaimValue[]
	| { [key: string]: CredentialClaimValue };

export interface CredentialClaims {
	[key: string]: CredentialClaimValue;
}

export interface VerificationError {
	code: ErrorCode;
	message: string;
	humanMessage?: string;
}

// === DID Types ===

export type DIDMethod = "key" | "web";

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
	publicKeyJwk?: JsonWebKey;
	publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
	id: string;
	type: string;
	serviceEndpoint: string;
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
	algorithm?: Algorithm;
	storage?: import("./storage/types").StorageAdapter;
}

export interface AgentIdentity {
	did: string;
	didDocument: DIDDocument;
	keyPair: KeyPair;
	domain: string;
	path?: string;
}

// === Delegation ===

export interface DelegateOptions {
	agent: string;
	owner: string;
	ownerKeyPair: KeyPair;
	scopes: string[];
	constraints?: DelegationConstraints;
	validFrom?: string;
	validUntil?: string;
	statusList?: { url: string; index: number };
	parentDelegation?: {
		token: string;
		parentOwnerPublicKey: Uint8Array;
	};
	maxChainDepth?: number;
}

export interface DelegationConstraints {
	maxTransactionValue?: number;
	validUntil?: string;
	allowedDomains?: string[];
	rateLimit?: number;
	[key: string]: unknown;
}

export interface DelegationCredential {
	token: string;
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

// Discriminated union: fields are guaranteed when valid, optional when not
export type DelegationResult =
	| {
			valid: true;
			agent: string;
			owner: string;
			scopes: string[];
			constraints?: DelegationConstraints;
			validFrom?: string;
			validUntil?: string;
			errors: [];
	  }
	| {
			valid: false;
			agent?: string;
			owner?: string;
			scopes?: string[];
			constraints?: DelegationConstraints;
			validFrom?: string;
			validUntil?: string;
			errors: VerificationError[];
	  };

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
