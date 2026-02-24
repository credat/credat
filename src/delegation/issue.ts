import { createSdJwtVc } from "../credentials/formats/sd-jwt-vc";
import { DelegationError, ErrorCodes } from "../errors";
import type {
	DelegateOptions,
	DelegationCredential,
	DelegationClaims,
	CredentialClaims,
} from "../types";

const DELEGATION_VC_TYPE = "CreditDelegationCredential";

export async function delegate(
	options: DelegateOptions,
): Promise<DelegationCredential> {
	const { agent, owner, ownerKeyPair, scopes, constraints, validFrom, validUntil } = options;

	if (scopes.length === 0) {
		throw new DelegationError(
			ErrorCodes.DELEGATION_SCOPE_INVALID,
			"At least one scope is required for delegation",
		);
	}

	const claims: CredentialClaims = {
		agent,
		owner,
		scopes: scopes as unknown as CredentialClaims,
	};

	if (constraints) {
		claims.constraints = constraints as unknown as CredentialClaims;
	}

	if (validFrom) {
		claims.validFrom = validFrom;
	}

	if (validUntil) {
		claims.validUntil = validUntil;
	}

	const selectiveDisclosure = ["scopes"];
	if (constraints) {
		selectiveDisclosure.push("constraints");
	}

	const raw = await createSdJwtVc({
		issuerPrivateKey: ownerKeyPair.privateKey,
		issuerPublicKey: ownerKeyPair.publicKey,
		issuerDid: owner,
		type: DELEGATION_VC_TYPE,
		claims,
		selectiveDisclosure,
		holderDid: agent,
		expiresAt: validUntil ? new Date(validUntil) : undefined,
		statusListUrl: options.statusListUrl,
		statusListIndex: options.statusListIndex,
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
		raw,
		claims: delegationClaims,
	};
}
