// credat — AI-native TypeScript SDK for eIDAS 2.0 verifiable credentials

export const VERSION = "0.1.0-alpha.1";

// === Main Entry Point ===
export { createClient } from "./client";
// === Config ===
export { validateConfig } from "./config";
export type {
	CreateStatusListCredentialOptions,
	CreateStatusListOptions,
	VerifyStatusListCredentialResult,
} from "./credentials";
// === Credentials (advanced) ===
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
export type { Algorithm, KeyPair } from "./crypto";
// === Crypto (advanced) ===
export { generateKeyPair, jwkToPublicKey, publicKeyToJwk } from "./crypto";
// === DID (advanced) ===
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
export type { KeyManager, StoredKey } from "./keys";
// === Keys (advanced) ===
export { LocalKeyManager } from "./keys";
export type { StorageAdapter } from "./storage";
// === Storage (advanced) ===
export { MemoryStorage } from "./storage";
// === Trust (advanced) ===
export { CustomTrustList, EuTrustList, isIssuerTrusted } from "./trust";
// === Types ===
export type {
	AIConfig,
	AIGeneratedSchema,
	ClaimDefinition,
	ClientConfig,
	CredatClient,
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
	TrustChainInfo,
	VerificationError,
	VerificationRequest,
	VerificationResult,
} from "./types";
