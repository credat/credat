export const ErrorCodes = {
	// DID
	DID_NOT_FOUND: "DID_NOT_FOUND",
	DID_METHOD_UNSUPPORTED: "DID_METHOD_UNSUPPORTED",
	DID_RESOLUTION_FAILED: "DID_RESOLUTION_FAILED",

	// Credential
	CREDENTIAL_INVALID_FORMAT: "CREDENTIAL_INVALID_FORMAT",
	CREDENTIAL_EXPIRED: "CREDENTIAL_EXPIRED",
	CREDENTIAL_SIGNATURE_INVALID: "CREDENTIAL_SIGNATURE_INVALID",
	STATUS_LIST_INVALID: "STATUS_LIST_INVALID",

	// Agent
	AGENT_CREATION_FAILED: "AGENT_CREATION_FAILED",
	AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
	AGENT_KEY_INVALID: "AGENT_KEY_INVALID",

	// Delegation
	DELEGATION_INVALID: "DELEGATION_INVALID",
	DELEGATION_EXPIRED: "DELEGATION_EXPIRED",
	DELEGATION_REVOKED: "DELEGATION_REVOKED",
	DELEGATION_SIGNATURE_INVALID: "DELEGATION_SIGNATURE_INVALID",
	DELEGATION_SCOPE_INVALID: "DELEGATION_SCOPE_INVALID",
	DELEGATION_NOT_YET_VALID: "DELEGATION_NOT_YET_VALID",

	// Handshake
	HANDSHAKE_INVALID_NONCE: "HANDSHAKE_INVALID_NONCE",
	HANDSHAKE_EXPIRED: "HANDSHAKE_EXPIRED",
	HANDSHAKE_VERIFICATION_FAILED: "HANDSHAKE_VERIFICATION_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class CredatError extends Error {
	constructor(
		public readonly code: ErrorCode,
		message: string,
		public readonly humanMessage?: string,
	) {
		super(message);
		this.name = "CredatError";
	}
}

export class DIDError extends CredatError {
	constructor(code: ErrorCode, message: string, humanMessage?: string) {
		super(code, message, humanMessage);
		this.name = "DIDError";
	}
}

export class CredentialError extends CredatError {
	constructor(code: ErrorCode, message: string, humanMessage?: string) {
		super(code, message, humanMessage);
		this.name = "CredentialError";
	}
}

export class AgentError extends CredatError {
	constructor(code: ErrorCode, message: string, humanMessage?: string) {
		super(code, message, humanMessage);
		this.name = "AgentError";
	}
}

export class DelegationError extends CredatError {
	constructor(code: ErrorCode, message: string, humanMessage?: string) {
		super(code, message, humanMessage);
		this.name = "DelegationError";
	}
}

export class HandshakeError extends CredatError {
	constructor(code: ErrorCode, message: string, humanMessage?: string) {
		super(code, message, humanMessage);
		this.name = "HandshakeError";
	}
}
