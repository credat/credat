// Credat — Trust layer for AI agents
export const VERSION = "0.2.0-alpha.1";

// ── Agent Identity ──
export { createAgent } from "./agent/create";
export type { LoadAgentOptions } from "./agent/load";
export { loadAgent } from "./agent/load";
// ── Low-level: Credentials ──
export type {
	CreateStatusListCredentialOptions,
	CreateStatusListOptions,
	SdJwtVcCreateOptions,
	SdJwtVcVerifyResult,
	VerifyStatusListCredentialResult,
} from "./credentials";
export {
	createSdJwtVc,
	createStatusList,
	createStatusListCredential,
	decodeStatusList,
	encodeStatusList,
	isRevoked,
	selectDisclosures,
	setRevocationStatus,
	verifySdJwtVc,
	verifyStatusListCredential,
} from "./credentials";
// ── Low-level: Crypto ──
export type { Algorithm, KeyPair } from "./crypto/keys";
export {
	base64urlToUint8Array,
	generateKeyPair,
	jwkToPublicKey,
	publicKeyToJwk,
	uint8ArrayToBase64url,
} from "./crypto/keys";
export { sign, verifySignature } from "./crypto/sign";
// ── Delegation ──
export { delegate } from "./delegation/issue";
export type { VerifyDelegationOptions } from "./delegation/verify";
export { verifyDelegation } from "./delegation/verify";
// ── Low-level: DID ──
export { createDidKey, resolveDidKey } from "./did/methods/key";
export {
	createDidWeb,
	didWebToUrl,
	resolveDidWeb,
} from "./did/methods/web";
export { resolveDID } from "./did/resolver";
// ── Errors ──
export type { ErrorCode } from "./errors";
export {
	AgentError,
	CredatError,
	CredentialError,
	DelegationError,
	DIDError,
	ErrorCodes,
	HandshakeError,
} from "./errors";
// ── Handshake Protocol ──
export { createChallenge } from "./handshake/challenge";
export type { PresentOptions } from "./handshake/present";
export { presentCredentials } from "./handshake/present";
export type { VerifyPresentationOptions } from "./handshake/verify";
export { verifyPresentation } from "./handshake/verify";
// ── Scopes ──
export type {
	ConstraintContext,
	ConstraintViolation,
	HasScopes,
} from "./scopes/helpers";
export {
	getAllScopes,
	hasAllScopes,
	hasAnyScope,
	hasScope,
	validateConstraints,
} from "./scopes/helpers";

// ── Storage ──
export { MemoryStorage } from "./storage/memory";
export {
	deleteStatusList,
	listStatusLists,
	loadStatusList,
	saveStatusList,
} from "./storage/status-list";
export type { StorageAdapter } from "./storage/types";

// ── Types ──
export type {
	AckMessage,
	AgentConfig,
	AgentIdentity,
	ChallengeMessage,
	CredentialClaims,
	CredentialClaimValue,
	CredentialFormat,
	DelegateOptions,
	DelegationClaims,
	DelegationConstraints,
	DelegationCredential,
	DelegationResult,
	DIDDocument,
	DIDMethod,
	DIDResolutionResult,
	HandshakeMessage,
	JsonWebKey,
	PresentationMessage,
	RevocationStatus,
	ServiceEndpoint,
	StatusListData,
	StatusListEntry,
	VerificationError,
	VerificationMethod,
} from "./types";
