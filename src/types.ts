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

export type CredentialFormat = "sd-jwt-vc" | "mdoc";

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
	raw: string; // Encoded credential (SD-JWT or CBOR)
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

export type DIDMethod = "key" | "web" | "jwk" | "ebsi";

export interface DIDDocument {
	id: string;
	verificationMethod?: VerificationMethod[];
	authentication?: string[];
	assertionMethod?: string[];
	capabilityInvocation?: string[];
	capabilityDelegation?: string[];
	keyAgreement?: (string | VerificationMethod)[];
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

// === AI Types ===

export interface AIGeneratedSchema extends CredentialSchema {
	confidence: number; // 0-1
	suggestions?: string[];
	eidasCompliance?: {
		compliant: boolean;
		warnings: string[];
		missingClaims?: string[];
	};
}

// === Client Types ===

export interface ClientConfig {
	mode: "local" | "cloud";
	apiKey?: string;
	baseUrl?: string;
	ai?: AIConfig;
	storage?: import("./storage/types").StorageAdapter;
}

export interface AIConfig {
	provider: "anthropic" | "openai" | "custom";
	apiKey?: string;
	model?: string;
	baseUrl?: string;
}

export interface CredatClient {
	credentials: {
		issue: (request: IssuanceRequest) => Promise<IssuedCredential>;
		verify: (request: VerificationRequest) => Promise<VerificationResult>;
	};
	did: {
		create: (options: DIDCreateOptions) => Promise<string>;
		resolve: (did: string) => Promise<DIDResolutionResult>;
	};
	ai: {
		generateSchema: (description: string) => Promise<AIGeneratedSchema>;
		generateTestFixtures: (
			schema: CredentialSchema,
			options?: { count?: number },
		) => Promise<IssuedCredential[]>;
		explainError: (error: VerificationError) => Promise<string>;
	};
	statusList: {
		create: (options: {
			id: string;
			url: string;
			size?: number;
		}) => Promise<StatusListData>;
		revoke: (listId: string, index: number) => Promise<void>;
		unrevoke: (listId: string, index: number) => Promise<void>;
		isRevoked: (listId: string, index: number) => Promise<boolean>;
		get: (listId: string) => Promise<StatusListData | null>;
		export: (listId: string) => Promise<string>;
	};
}
