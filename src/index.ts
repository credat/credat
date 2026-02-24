// credat — trust layer for AI agents

export const VERSION = "0.1.0-alpha.1";

// === Credentials ===
export type {
	CreateStatusListCredentialOptions,
	CreateStatusListOptions,
	VerifyStatusListCredentialResult,
} from "./credentials";
export {
	createSdJwtVc,
	createStatusList,
	createStatusListCredential,
	decodeStatusList,
	encodeStatusList,
	isRevoked,
	presentSdJwtVc,
	setRevocationStatus,
	verifySdJwtVc,
	verifyStatusListCredential,
} from "./credentials";
// === Crypto ===
export type { Algorithm, KeyPair } from "./crypto";
export { generateKeyPair, jwkToPublicKey, publicKeyToJwk } from "./crypto";
// === DID ===
export {
	createDidKey,
	createDidWeb,
	resolveDID,
	resolveDidKey,
	resolveDidWeb,
} from "./did";
// === Errors ===
export {
	CredatError,
	CredentialError,
	DIDError,
	ErrorCodes,
} from "./errors";
// === Storage ===
export type { StorageAdapter } from "./storage";
export { MemoryStorage } from "./storage";
// === Types ===
export type {
	ClaimDefinition,
	CredentialClaims,
	CredentialFormat,
	CredentialSchema,
	DIDCreateOptions,
	DIDDocument,
	DIDMethod,
	DIDResolutionResult,
	IssuanceRequest,
	IssuedCredential,
	JsonWebKey,
	RevocationStatus,
	StatusListData,
	StatusListEntry,
	VerificationError,
	VerificationRequest,
	VerificationResult,
} from "./types";
