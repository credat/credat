import { verifySdJwtVc } from "../credentials/formats/sd-jwt-vc";
import { ErrorCodes } from "../errors";
import type {
	DelegationConstraints,
	DelegationResult,
	VerificationError,
} from "../types";

export interface VerifyDelegationOptions {
	ownerPublicKey: Uint8Array;
}

function extractDelegationFields(
	claims: Record<string, unknown>,
	issuer: string,
) {
	const agent = typeof claims.agent === "string" ? claims.agent : "";
	const owner = issuer;
	const scopes = Array.isArray(claims.scopes)
		? claims.scopes.filter((s): s is string => typeof s === "string")
		: [];
	const constraints =
		claims.constraints && typeof claims.constraints === "object"
			? (claims.constraints as DelegationConstraints)
			: undefined;
	const validFrom =
		typeof claims.validFrom === "string" ? claims.validFrom : undefined;
	const validUntil =
		typeof claims.validUntil === "string" ? claims.validUntil : undefined;

	return { agent, owner, scopes, constraints, validFrom, validUntil };
}

// Map SD-JWT error strings to specific error codes
function mapSdJwtError(msg: string): VerificationError {
	if (msg === "Invalid signature") {
		return { code: ErrorCodes.DELEGATION_SIGNATURE_INVALID, message: msg };
	}
	return { code: ErrorCodes.CREDENTIAL_INVALID_FORMAT, message: msg };
}

export async function verifyDelegation(
	token: string,
	options: VerifyDelegationOptions,
): Promise<DelegationResult> {
	const { ownerPublicKey } = options;

	const result = await verifySdJwtVc(token, ownerPublicKey);

	if (!result.valid) {
		return {
			valid: false,
			errors: (result.errors ?? []).map(mapSdJwtError),
		};
	}

	const fields = extractDelegationFields(result.claims, result.issuer);
	const errors: VerificationError[] = [];

	// Validate required fields
	if (!fields.agent) {
		errors.push({
			code: ErrorCodes.DELEGATION_INVALID,
			message: "Delegation credential missing 'agent' claim",
		});
	}

	if (fields.scopes.length === 0) {
		errors.push({
			code: ErrorCodes.DELEGATION_SCOPE_INVALID,
			message: "Delegation credential missing 'scopes' claim",
		});
	}

	// Check not-yet-valid (validFrom in the future)
	if (fields.validFrom) {
		const validFromTime = new Date(fields.validFrom).getTime();
		if (Number.isNaN(validFromTime)) {
			errors.push({
				code: ErrorCodes.DELEGATION_INVALID,
				message: `Invalid validFrom date format: ${fields.validFrom}`,
			});
		} else if (validFromTime > Date.now()) {
			errors.push({
				code: ErrorCodes.DELEGATION_NOT_YET_VALID,
				message: `Delegation is not yet valid (validFrom: ${fields.validFrom})`,
			});
		}
	}

	// Check expiration
	if (result.expiresAt && result.expiresAt.getTime() < Date.now()) {
		errors.push({
			code: ErrorCodes.DELEGATION_EXPIRED,
			message: `Delegation expired at ${result.expiresAt.toISOString()}`,
		});
	}

	if (errors.length > 0) {
		return { valid: false, ...fields, errors };
	}

	return { valid: true, ...fields, errors: [] as [] };
}
