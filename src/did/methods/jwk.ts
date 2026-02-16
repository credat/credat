import {
	base64urlToUint8Array,
	uint8ArrayToBase64url,
} from "../../crypto/keys";
import type {
	DIDDocument,
	DIDResolutionResult,
	JsonWebKey,
	VerificationMethod,
} from "../../types";

export function createDidJwk(jwk: JsonWebKey): string {
	if (jwk.d) {
		throw new Error("Cannot create did:jwk from a private key (has d)");
	}

	const json = JSON.stringify(jwk);
	const encoded = uint8ArrayToBase64url(new TextEncoder().encode(json));
	return `did:jwk:${encoded}`;
}

export function resolveDidJwk(did: string): DIDResolutionResult {
	try {
		const prefix = "did:jwk:";
		if (!did.startsWith(prefix)) {
			return {
				didDocument: null,
				didResolutionMetadata: { error: "invalidDid" },
				didDocumentMetadata: {},
			};
		}

		const encoded = did.slice(prefix.length);
		const decoded = new TextDecoder().decode(base64urlToUint8Array(encoded));
		const jwk = JSON.parse(decoded) as JsonWebKey;

		if (jwk.d) {
			return {
				didDocument: null,
				didResolutionMetadata: { error: "invalidDid" },
				didDocumentMetadata: {},
			};
		}

		const keyId = `${did}#0`;

		const verificationMethod: VerificationMethod = {
			id: keyId,
			type: "JsonWebKey2020",
			controller: did,
			publicKeyJwk: jwk,
		};

		const didDocument: DIDDocument = {
			id: did,
			verificationMethod: [verificationMethod],
		};

		if (jwk.use === "sig") {
			didDocument.authentication = [keyId];
			didDocument.assertionMethod = [keyId];
			didDocument.capabilityInvocation = [keyId];
			didDocument.capabilityDelegation = [keyId];
		} else if (jwk.use === "enc") {
			didDocument.keyAgreement = [keyId];
		} else {
			// No use specified — all relationships
			didDocument.authentication = [keyId];
			didDocument.assertionMethod = [keyId];
			didDocument.capabilityInvocation = [keyId];
			didDocument.capabilityDelegation = [keyId];
			didDocument.keyAgreement = [keyId];
		}

		return {
			didDocument,
			didResolutionMetadata: {},
			didDocumentMetadata: {},
		};
	} catch {
		return {
			didDocument: null,
			didResolutionMetadata: { error: "invalidDid" },
			didDocumentMetadata: {},
		};
	}
}
