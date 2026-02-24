import { uint8ArrayToBase64url } from "../crypto/keys";
import { sign } from "../crypto/sign";
import type {
	AgentIdentity,
	ChallengeMessage,
	PresentationMessage,
} from "../types";

export interface PresentOptions {
	challenge: ChallengeMessage;
	delegation: string;
	agent: AgentIdentity;
}

export async function presentCredentials(
	options: PresentOptions,
): Promise<PresentationMessage> {
	const { challenge, delegation, agent } = options;

	const nonceBytes = new TextEncoder().encode(challenge.nonce);
	const signature = sign(
		nonceBytes,
		agent.keyPair.privateKey,
		agent.keyPair.algorithm,
	);

	return {
		type: "credat:presentation",
		delegation,
		nonce: challenge.nonce,
		proof: uint8ArrayToBase64url(signature),
		from: agent.did,
	};
}
