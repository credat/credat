import { createSdJwtVc } from "../credentials/formats/sd-jwt-vc";
import { DelegationError, ErrorCodes } from "../errors";
import type {
	CredentialClaims,
	DelegateOptions,
	DelegationClaims,
	DelegationCredential,
} from "../types";

const DELEGATION_VC_TYPE = "AgentDelegationCredential";

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
