import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import {
	generateKeyPair,
	publicKeyToJwk,
	uint8ArrayToBase64url,
} from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";
import { AgentError, ErrorCodes } from "../errors";
import type {
	AgentConfig,
	AgentIdentity,
	DIDDocument,
	JsonWebKey,
} from "../types";

export async function createAgent(config: AgentConfig): Promise<AgentIdentity> {
	const { domain, path, algorithm = "ES256", storage } = config;

	if (!domain) {
		throw new AgentError(
			ErrorCodes.AGENT_CREATION_FAILED,
			"Domain is required to create an agent",
		);
	}

	const did = createDidWeb(domain, path);

	const keyPair = generateAgentKeyPair(algorithm);
	const jwk = agentPublicKeyToJwk(keyPair.publicKey, algorithm);

	const keyId = `${did}#key-0`;

	const didDocument: DIDDocument = {
		id: did,
		verificationMethod: [
			{
				id: keyId,
				type: "JsonWebKey2020",
				controller: did,
				publicKeyJwk: jwk,
			},
		],
		authentication: [keyId],
		assertionMethod: [keyId],
	};

	const identity: AgentIdentity = {
		did,
		didDocument,
		keyPair: {
			algorithm,
			publicKey: keyPair.publicKey,
			privateKey: keyPair.privateKey,
		},
		algorithm,
		domain,
		path,
	};

	if (storage) {
		await storage.set("agents", did, identity);
	}

	return identity;
}

function generateAgentKeyPair(algorithm: string): {
	algorithm: string;
	publicKey: Uint8Array;
	privateKey: Uint8Array;
} {
	if (algorithm === "ES256K") {
		const privateKey = randomBytes(32);
		const publicKey = secp256k1.getPublicKey(privateKey, true);
		return { algorithm, privateKey, publicKey };
	}

	const kp = generateKeyPair(algorithm as "ES256" | "EdDSA");
	return {
		algorithm: kp.algorithm,
		publicKey: kp.publicKey,
		privateKey: kp.privateKey,
	};
}

function agentPublicKeyToJwk(
	publicKey: Uint8Array,
	algorithm: string,
): JsonWebKey {
	if (algorithm === "ES256K") {
		const point = secp256k1.Point.fromHex(bytesToHex(publicKey));
		const uncompressed = point.toBytes(false); // 65 bytes: 0x04 || x || y
		const x = uncompressed.slice(1, 33);
		const y = uncompressed.slice(33, 65);
		return {
			kty: "EC",
			crv: "secp256k1",
			x: uint8ArrayToBase64url(x),
			y: uint8ArrayToBase64url(y),
		};
	}

	return publicKeyToJwk(publicKey, algorithm as "ES256" | "EdDSA");
}
