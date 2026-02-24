import { generateKeyPair, publicKeyToJwk } from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";
import { AgentError, ErrorCodes } from "../errors";
import type { AgentConfig, AgentIdentity, DIDDocument } from "../types";

export async function createAgent(config: AgentConfig): Promise<AgentIdentity> {
	const { domain, path, algorithm = "ES256", storage } = config;

	if (!domain) {
		throw new AgentError(
			ErrorCodes.AGENT_CREATION_FAILED,
			"Domain is required to create an agent",
		);
	}

	const did = createDidWeb(domain, path);
	const keyPair = generateKeyPair(algorithm);
	const jwk = publicKeyToJwk(keyPair.publicKey, algorithm);
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
		keyPair,
		domain,
		path,
	};

	if (storage) {
		try {
			await storage.set("agents", did, identity);
		} catch (cause) {
			throw new AgentError(
				ErrorCodes.AGENT_CREATION_FAILED,
				`Agent created but failed to persist: ${(cause as Error).message}`,
			);
		}
	}

	return identity;
}
