import { ed25519 } from "@noble/curves/ed25519.js";
import { p256 } from "@noble/curves/nist.js";
import type { Algorithm } from "./keys";

export function sign(
	payload: Uint8Array,
	privateKey: Uint8Array,
	algorithm: Algorithm,
): Uint8Array {
	if (algorithm === "ES256") {
		return p256.sign(payload, privateKey, { lowS: true });
	}

	if (algorithm === "EdDSA") {
		return ed25519.sign(payload, privateKey);
	}

	throw new Error(`Unsupported algorithm: ${algorithm}`);
}

export function verifySignature(
	payload: Uint8Array,
	signature: Uint8Array,
	publicKey: Uint8Array,
	algorithm: Algorithm,
): boolean {
	try {
		if (algorithm === "ES256") {
			return p256.verify(signature, payload, publicKey, { lowS: true });
		}

		if (algorithm === "EdDSA") {
			return ed25519.verify(signature, payload, publicKey);
		}

		return false;
	} catch {
		return false;
	}
}
