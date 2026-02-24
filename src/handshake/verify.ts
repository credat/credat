import { verifySignature } from "../crypto/sign";
import { base64urlToUint8Array } from "../crypto/keys";
import type { Algorithm } from "../crypto/keys";
import { verifyDelegation } from "../delegation/verify";
import { ErrorCodes } from "../errors";
import type {
	ChallengeMessage,
	DelegationResult,
	PresentationMessage,
	VerificationError,
} from "../types";

export interface VerifyPresentationOptions {
	challenge: ChallengeMessage;
	ownerPublicKey: Uint8Array;
	agentPublicKey: Uint8Array;
	agentAlgorithm?: Algorithm;
}

function inferAlgorithm(publicKey: Uint8Array): Algorithm {
	// ES256 (P-256) compressed keys are 33 bytes, EdDSA (Ed25519) keys are 32 bytes
	if (publicKey.length === 33) return "ES256";
	if (publicKey.length === 32) return "EdDSA";
	throw new Error(`Cannot infer algorithm from public key length: ${publicKey.length}`);
}

export async function verifyPresentation(
	presentation: PresentationMessage,
	options: VerifyPresentationOptions,
): Promise<DelegationResult> {
	const { challenge, ownerPublicKey, agentPublicKey } = options;
	const errors: VerificationError[] = [];

	// 1. Check nonce matches
	if (presentation.nonce !== challenge.nonce) {
		errors.push({
			code: ErrorCodes.HANDSHAKE_INVALID_NONCE,
			message: "Presentation nonce does not match challenge nonce",
		});

		return {
			valid: false,
			agent: presentation.from,
			owner: "",
			scopes: [],
			errors,
		};
	}

	// 2. Verify nonce proof (agent signed the nonce)
	const algorithm = options.agentAlgorithm ?? inferAlgorithm(agentPublicKey);
	const nonceBytes = new TextEncoder().encode(presentation.nonce);
	const proofBytes = base64urlToUint8Array(presentation.proof);

	const proofValid = verifySignature(
		nonceBytes,
		proofBytes,
		agentPublicKey,
		algorithm,
	);

	if (!proofValid) {
		errors.push({
			code: ErrorCodes.HANDSHAKE_VERIFICATION_FAILED,
			message: "Agent nonce signature is invalid",
		});

		return {
			valid: false,
			agent: presentation.from,
			owner: "",
			scopes: [],
			errors,
		};
	}

	// 3. Verify delegation VC
	const delegationResult = await verifyDelegation(presentation.delegation, {
		ownerPublicKey,
	});

	if (!delegationResult.valid) {
		return delegationResult;
	}

	return {
		valid: true,
		agent: delegationResult.agent,
		owner: delegationResult.owner,
		scopes: delegationResult.scopes,
		constraints: delegationResult.constraints,
		validFrom: delegationResult.validFrom,
		validUntil: delegationResult.validUntil,
		errors: [],
	};
}
