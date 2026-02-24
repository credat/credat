export class CredatError extends Error {
	public readonly code: string;
	public readonly humanMessage?: string;

	constructor(code: string, message: string, humanMessage?: string) {
		super(message);
		this.name = "CredatError";
		this.code = code;
		this.humanMessage = humanMessage;
	}
}

export class CredentialError extends CredatError {
	constructor(code: string, message: string, humanMessage?: string) {
		super(code, message, humanMessage);
		this.name = "CredentialError";
	}
}

export class DIDError extends CredatError {
	constructor(code: string, message: string, humanMessage?: string) {
		super(code, message, humanMessage);
		this.name = "DIDError";
	}
}


// Error codes
export const ErrorCodes = {
	// Credential errors
	INVALID_CLAIMS: "CREDENTIAL_INVALID_CLAIMS",
	INVALID_FORMAT: "CREDENTIAL_INVALID_FORMAT",
	EXPIRED: "CREDENTIAL_EXPIRED",
	SIGNATURE_INVALID: "CREDENTIAL_SIGNATURE_INVALID",
	ISSUER_UNTRUSTED: "CREDENTIAL_ISSUER_UNTRUSTED",
	MISSING_REQUIRED_CLAIMS: "CREDENTIAL_MISSING_REQUIRED_CLAIMS",

	// DID errors
	DID_NOT_FOUND: "DID_NOT_FOUND",
	DID_METHOD_UNSUPPORTED: "DID_METHOD_UNSUPPORTED",
	DID_RESOLUTION_FAILED: "DID_RESOLUTION_FAILED",

	// Revocation errors
	REVOKED: "CREDENTIAL_REVOKED",
	STATUS_LIST_INVALID: "STATUS_LIST_INVALID",

	// Config errors
	MISSING_API_KEY: "CONFIG_MISSING_API_KEY",
	INVALID_CONFIG: "CONFIG_INVALID",

	// AI errors
	AI_REQUEST_FAILED: "AI_REQUEST_FAILED",
	AI_PARSE_FAILED: "AI_PARSE_FAILED",
} as const;
