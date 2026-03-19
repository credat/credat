import { createSdJwtVc } from "../credentials/formats/sd-jwt-vc";
import { base64urlToUint8Array } from "../crypto/keys";
import { DelegationError, ErrorCodes } from "../errors";
import type {
	CredentialClaims,
	DelegateOptions,
	DelegationClaims,
	DelegationCredential,
} from "../types";

const DELEGATION_VC_TYPE = "AgentDelegationCredential";
const DEFAULT_MAX_CHAIN_DEPTH = 3;

function getChainDepth(token: string): number {
	let depth = 0;
	let current = token;

	while (true) {
		try {
			const parts = current.split("~");
			const jwt = parts[0] ?? "";
			const payloadB64 = jwt.split(".")[1] ?? "";
			const payload = JSON.parse(
				new TextDecoder().decode(base64urlToUint8Array(payloadB64)),
			) as Record<string, unknown>;

			if (typeof payload._parentDelegation !== "string") break;
			depth++;
			current = payload._parentDelegation;
		} catch {
			break;
		}
	}

	return depth;
}

export async function delegate(
	options: DelegateOptions,
): Promise<DelegationCredential> {
	const {
		agent,
		owner,
		ownerKeyPair,
		scopes,
		constraints,
		validFrom,
		validUntil,
	} = options;

	if (scopes.length === 0) {
		throw new DelegationError(
			ErrorCodes.DELEGATION_SCOPE_INVALID,
			"At least one scope is required for delegation",
		);
	}

	// Handle chain delegation
	if (options.parentDelegation) {
		const { token: parentToken, parentOwnerPublicKey } =
			options.parentDelegation;

		// Verify the parent delegation
		const { verifyDelegation } = await import("./verify");
		const parentResult = await verifyDelegation(parentToken, {
			ownerPublicKey: parentOwnerPublicKey,
		});

		if (!parentResult.valid) {
			throw new DelegationError(
				ErrorCodes.DELEGATION_INVALID,
				"Parent delegation is invalid",
			);
		}

		// Enforce scope subsetting
		const parentScopes = new Set(parentResult.scopes);
		const invalidScopes = scopes.filter((s) => !parentScopes.has(s));
		if (invalidScopes.length > 0) {
			throw new DelegationError(
				ErrorCodes.DELEGATION_SCOPE_INVALID,
				`Scopes not in parent delegation: ${invalidScopes.join(", ")}`,
			);
		}

		// Check chain depth
		const maxDepth = options.maxChainDepth ?? DEFAULT_MAX_CHAIN_DEPTH;
		const currentDepth = getChainDepth(parentToken) + 1;
		if (currentDepth > maxDepth) {
			throw new DelegationError(
				ErrorCodes.DELEGATION_INVALID,
				`Delegation chain depth ${currentDepth} exceeds maximum ${maxDepth}`,
			);
		}
	}

	const claims: CredentialClaims = {
		agent,
		owner,
		scopes,
	};

	if (constraints) {
		claims.constraints = constraints as CredentialClaims;
	}

	if (validFrom) {
		claims.validFrom = validFrom;
	}

	if (validUntil) {
		claims.validUntil = validUntil;
	}

	if (options.parentDelegation) {
		claims._parentDelegation = options.parentDelegation.token;
	}

	const selectiveDisclosure = ["scopes"];
	if (constraints) {
		selectiveDisclosure.push("constraints");
	}

	const token = await createSdJwtVc({
		issuerPrivateKey: ownerKeyPair.privateKey,
		issuerPublicKey: ownerKeyPair.publicKey,
		issuerDid: owner,
		type: DELEGATION_VC_TYPE,
		claims,
		selectiveDisclosure,
		algorithm: ownerKeyPair.algorithm,
		holderDid: agent,
		expiresAt: validUntil ? new Date(validUntil) : undefined,
		statusList: options.statusList,
	});

	const delegationClaims: DelegationClaims = {
		agent,
		owner,
		scopes,
	};

	if (constraints) {
		delegationClaims.constraints = constraints;
	}

	if (validFrom) {
		delegationClaims.validFrom = validFrom;
	}

	if (validUntil) {
		delegationClaims.validUntil = validUntil;
	}

	return {
		token,
		claims: delegationClaims,
	};
}
