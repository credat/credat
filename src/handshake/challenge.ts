import { randomBytes } from "@noble/hashes/utils.js";
import { uint8ArrayToBase64url } from "../crypto/keys";
import type { ChallengeMessage } from "../types";

export function createChallenge(options: { from: string }): ChallengeMessage {
	const nonce = uint8ArrayToBase64url(randomBytes(32));

	return {
		type: "credat:challenge",
		nonce,
		from: options.from,
		timestamp: new Date().toISOString(),
	};
}
