import { describe, expect, it } from "vitest";
import { generateKeyPair, publicKeyToJwk } from "../../crypto";
import type { JsonWebKey } from "../../types";
import { createDidJwk, resolveDidJwk } from "./jwk";

describe("did:jwk", () => {
	it("creates and resolves a P-256 JWK round-trip", () => {
		const kp = generateKeyPair("ES256");
		const jwk = publicKeyToJwk(kp.publicKey, "ES256");
		const did = createDidJwk(jwk);
		expect(did).toMatch(/^did:jwk:/);

		const result = resolveDidJwk(did);
		expect(result.didDocument).not.toBeNull();
		expect(result.didDocument?.id).toBe(did);
		const resolvedJwk =
			result.didDocument?.verificationMethod?.[0]?.publicKeyJwk;
		expect(resolvedJwk?.crv).toBe("P-256");
		expect(resolvedJwk?.x).toBe(jwk.x);
		expect(resolvedJwk?.y).toBe(jwk.y);
	});

	it("creates and resolves an Ed25519 JWK round-trip", () => {
		const kp = generateKeyPair("EdDSA");
		const jwk = publicKeyToJwk(kp.publicKey, "EdDSA");
		const did = createDidJwk(jwk);

		const result = resolveDidJwk(did);
		expect(result.didDocument).not.toBeNull();
		const resolvedJwk =
			result.didDocument?.verificationMethod?.[0]?.publicKeyJwk;
		expect(resolvedJwk?.crv).toBe("Ed25519");
		expect(resolvedJwk?.x).toBe(jwk.x);
	});

	it("use=sig → no keyAgreement", () => {
		const kp = generateKeyPair("ES256");
		const jwk: JsonWebKey = {
			...publicKeyToJwk(kp.publicKey, "ES256"),
			use: "sig",
		};
		const did = createDidJwk(jwk);
		const result = resolveDidJwk(did);

		expect(result.didDocument?.authentication).toHaveLength(1);
		expect(result.didDocument?.assertionMethod).toHaveLength(1);
		expect(result.didDocument?.capabilityInvocation).toHaveLength(1);
		expect(result.didDocument?.capabilityDelegation).toHaveLength(1);
		expect(result.didDocument?.keyAgreement).toBeUndefined();
	});

	it("use=enc → only keyAgreement", () => {
		const kp = generateKeyPair("ES256");
		const jwk: JsonWebKey = {
			...publicKeyToJwk(kp.publicKey, "ES256"),
			use: "enc",
		};
		const did = createDidJwk(jwk);
		const result = resolveDidJwk(did);

		expect(result.didDocument?.keyAgreement).toHaveLength(1);
		expect(result.didDocument?.authentication).toBeUndefined();
		expect(result.didDocument?.assertionMethod).toBeUndefined();
		expect(result.didDocument?.capabilityInvocation).toBeUndefined();
		expect(result.didDocument?.capabilityDelegation).toBeUndefined();
	});

	it("no use → all relationships present", () => {
		const kp = generateKeyPair("ES256");
		const jwk = publicKeyToJwk(kp.publicKey, "ES256");
		const did = createDidJwk(jwk);
		const result = resolveDidJwk(did);

		expect(result.didDocument?.authentication).toHaveLength(1);
		expect(result.didDocument?.assertionMethod).toHaveLength(1);
		expect(result.didDocument?.capabilityInvocation).toHaveLength(1);
		expect(result.didDocument?.capabilityDelegation).toHaveLength(1);
		expect(result.didDocument?.keyAgreement).toHaveLength(1);
	});

	it("rejects private key (has d) on create", () => {
		const jwk: JsonWebKey = {
			kty: "EC",
			crv: "P-256",
			x: "test",
			y: "test",
			d: "private",
		};
		expect(() => createDidJwk(jwk)).toThrow("private key");
	});

	it("rejects private key (has d) on resolve", () => {
		// Manually construct a did:jwk with a d member
		const jwk: JsonWebKey = {
			kty: "EC",
			crv: "P-256",
			x: "test",
			y: "test",
			d: "private",
		};
		const json = JSON.stringify(jwk);
		const encoded = Buffer.from(json)
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		const did = `did:jwk:${encoded}`;

		const result = resolveDidJwk(did);
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("invalidDid");
	});

	it("fragment is always #0", () => {
		const kp = generateKeyPair("ES256");
		const jwk = publicKeyToJwk(kp.publicKey, "ES256");
		const did = createDidJwk(jwk);
		const result = resolveDidJwk(did);
		const vmId = result.didDocument?.verificationMethod?.[0]?.id;
		expect(vmId).toBe(`${did}#0`);
	});
});
