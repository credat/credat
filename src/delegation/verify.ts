import { verifySdJwtVc } from "../credentials/formats/sd-jwt-vc";
import { base64urlToUint8Array } from "../crypto/keys";
import { ErrorCodes } from "../errors";
import type {
	DelegationConstraints,
	DelegationResult,
	StatusListEntry,
	VerificationError,
} from "../types";

export interface VerifyDelegationOptions {
	ownerPublicKey: Uint8Array;
	checkRevocation?: (entry: StatusListEntry) => Promise<boolean>;
	maxChainDepth?: number;
	resolveSignerKey?: (agentDid: string) => Promise<Uint8Array>;
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

// Map SD-JWT error strings to specific error codes using pattern matching
function mapSdJwtError(msg: string): VerificationError {
	if (/signature/i.test(msg)) {
		return { code: ErrorCodes.DELEGATION_SIGNATURE_INVALID, message: msg };
	}
	return { code: ErrorCodes.CREDENTIAL_INVALID_FORMAT, message: msg };
}

function extractParentDelegation(token: string): string | undefined {
	try {
		const parts = token.split("~");
		const jwt = parts[0] ?? "";
		const payloadB64 = jwt.split(".")[1] ?? "";
		const payload = JSON.parse(
			new TextDecoder().decode(base64urlToUint8Array(payloadB64)),
		) as Record<string, unknown>;
		return typeof payload._parentDelegation === "string"
			? payload._parentDelegation
			: undefined;
	} catch {
		return undefined;
	}
}

export async function verifyDelegation(
	token: string,
	options: VerifyDelegationOptions,
): Promise<DelegationResult> {
	return _verifyDelegation(token, options, 0);
}

async function _verifyDelegation(
	token: string,
	options: VerifyDelegationOptions,
	depth: number,
): Promise<DelegationResult> {
	const maxDepth = options.maxChainDepth ?? 3;

	if (depth > maxDepth) {
		return {
			valid: false,
			errors: [
				{
					code: ErrorCodes.DELEGATION_INVALID,
					message: `Delegation chain depth ${depth} exceeds maximum ${maxDepth}`,
				},
			],
		};
	}

	const parentToken = extractParentDelegation(token);

	if (parentToken) {
		// Chained delegation
		if (!options.resolveSignerKey) {
			return {
				valid: false,
				errors: [
					{
						code: ErrorCodes.DELEGATION_INVALID,
						message:
							"resolveSignerKey callback required for chained delegations",
					},
				],
			};
		}

		// Verify parent first (recursively)
		const parentResult = await _verifyDelegation(
			parentToken,
			options,
			depth + 1,
		);
		if (!parentResult.valid) {
			return {
				valid: false,
				errors: [
					{
						code: ErrorCodes.DELEGATION_INVALID,
						message: "Parent delegation in chain is invalid",
					},
					...parentResult.errors,
				],
			};
		}

		// Resolve the parent's agent key (that agent signed this leaf delegation)
		const signerKey = await options.resolveSignerKey(parentResult.agent);

		// Verify the leaf delegation with the resolved signer key
		return verifyDelegationWithKey(
			token,
			signerKey,
			parentResult.scopes,
			options,
		);
	}

	// Direct (non-chained) delegation
	return verifyDelegationWithKey(
		token,
		options.ownerPublicKey,
		undefined,
		options,
	);
}

async function verifyDelegationWithKey(
	token: string,
	signerPublicKey: Uint8Array,
	parentScopes: string[] | undefined,
	options: VerifyDelegationOptions,
): Promise<DelegationResult> {
	const result = await verifySdJwtVc(token, signerPublicKey);

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

	// Check scope subsetting for chained delegations
	if (parentScopes) {
		const parentScopeSet = new Set(parentScopes);
		const invalidScopes = fields.scopes.filter((s) => !parentScopeSet.has(s));
		if (invalidScopes.length > 0) {
			errors.push({
				code: ErrorCodes.DELEGATION_SCOPE_INVALID,
				message: `Scopes exceed parent delegation: ${invalidScopes.join(", ")}`,
			});
		}
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

	// Check revocation if callback provided and credential has status list entry
	if (options.checkRevocation && result.statusListEntry) {
		try {
			const revoked = await options.checkRevocation({
				statusListUrl: result.statusListEntry.statusListUrl,
				statusListIndex: result.statusListEntry.statusListIndex,
			});
			if (revoked) {
				errors.push({
					code: ErrorCodes.DELEGATION_REVOKED,
					message: "Delegation credential has been revoked",
				});
			}
		} catch (e) {
			errors.push({
				code: ErrorCodes.DELEGATION_INVALID,
				message: `Revocation check failed: ${e instanceof Error ? e.message : "unknown error"}`,
			});
		}
	}

	if (errors.length > 0) {
		return { valid: false, ...fields, errors };
	}

	return { valid: true, ...fields, errors: [] as [] };
}
