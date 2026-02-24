import { verifySdJwtVc } from "../credentials/formats/sd-jwt-vc";
import { ErrorCodes } from "../errors";
import type {
	DelegationConstraints,
	DelegationResult,
	VerificationError,
} from "../types";

export interface VerifyDelegationOptions {
	ownerPublicKey: Uint8Array;
	algorithm?: string;
	checkRevocation?: boolean;
}

export async function verifyDelegation(
	token: string,
	options: VerifyDelegationOptions,
): Promise<DelegationResult> {
	const { ownerPublicKey } = options;

	const result = await verifySdJwtVc(token, ownerPublicKey);

	if (!result.valid) {
		const errors: VerificationError[] = (result.errors ?? []).map((msg) => ({
			code: ErrorCodes.DELEGATION_SIGNATURE_INVALID,
			message: msg,
		}));

		return {
			valid: false,
			agent: "",
			owner: "",
			scopes: [],
			errors,
		};
	}

	// Check expiration
	const errors: VerificationError[] = [];
	if (result.expiresAt && result.expiresAt.getTime() < Date.now()) {
		errors.push({
			code: ErrorCodes.DELEGATION_EXPIRED,
			message: `Delegation expired at ${result.expiresAt.toISOString()}`,
		});
	}

	if (errors.length > 0) {
		return {
			valid: false,
			agent: result.claims.agent as string,
			owner: result.issuer,
			scopes: result.claims.scopes as unknown as string[],
			constraints: result.claims.constraints as unknown as
				| DelegationConstraints
				| undefined,
			validFrom: result.claims.validFrom as string | undefined,
			validUntil: result.claims.validUntil as string | undefined,
			errors,
		};
	}

	return {
		valid: true,
		agent: result.claims.agent as string,
		owner: result.issuer,
		scopes: result.claims.scopes as unknown as string[],
		constraints: result.claims.constraints as unknown as
			| DelegationConstraints
			| undefined,
		validFrom: result.claims.validFrom as string | undefined,
		validUntil: result.claims.validUntil as string | undefined,
		errors: [],
	};
}
