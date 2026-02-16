import { describe, expect, it } from "vitest";
import { generateKeyPair } from "../../crypto";
import { createDidKey, resolveDidKey } from "./key";

describe("did:key", () => {
	it("creates a did:key from P-256 public key", () => {
		const kp = generateKeyPair("ES256");
		const did = createDidKey(kp.publicKey, "ES256");
		expect(did).toMatch(/^did:key:z/);
	});

	it("creates a did:key from Ed25519 public key", () => {
		const kp = generateKeyPair("EdDSA");
		const did = createDidKey(kp.publicKey, "EdDSA");
		expect(did).toMatch(/^did:key:z/);
	});

	it("resolves a did:key to a DID document", () => {
		const kp = generateKeyPair("ES256");
		const did = createDidKey(kp.publicKey, "ES256");
		const result = resolveDidKey(did);
		expect(result.didDocument).not.toBeNull();
		expect(result.didDocument?.id).toBe(did);
		expect(result.didDocument?.verificationMethod).toHaveLength(1);
		expect(
			result.didDocument?.verificationMethod?.[0]?.publicKeyJwk,
		).toBeDefined();
	});

	it("round-trips: create → resolve → verify key matches", () => {
		const kp = generateKeyPair("ES256");
		const did = createDidKey(kp.publicKey, "ES256");
		const result = resolveDidKey(did);
		const jwk = result.didDocument?.verificationMethod?.[0]?.publicKeyJwk;
		expect(jwk.crv).toBe("P-256");
		expect(jwk.x).toBeDefined();
		expect(jwk.y).toBeDefined();
	});

	it("round-trips Ed25519: create → resolve → verify key matches", () => {
		const kp = generateKeyPair("EdDSA");
		const did = createDidKey(kp.publicKey, "EdDSA");
		const result = resolveDidKey(did);
		const jwk = result.didDocument?.verificationMethod?.[0]?.publicKeyJwk;
		expect(jwk.crv).toBe("Ed25519");
		expect(jwk.x).toBeDefined();
	});

	it("returns error for invalid did:key", () => {
		const result = resolveDidKey("did:key:invalid");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBeDefined();
	});

	it("returns error for non-did:key prefix", () => {
		const result = resolveDidKey("did:key:abc");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBeDefined();
	});

	it("creates a did:key from secp256k1 public key", () => {
		const kp = generateKeyPair("ES256K");
		const did = createDidKey(kp.publicKey, "ES256K");
		expect(did).toMatch(/^did:key:z/);
	});

	it("round-trips secp256k1: create → resolve → verify key matches", () => {
		const kp = generateKeyPair("ES256K");
		const did = createDidKey(kp.publicKey, "ES256K");
		const result = resolveDidKey(did);
		expect(result.didDocument).not.toBeNull();
		expect(result.didDocument?.id).toBe(did);
		const jwk = result.didDocument?.verificationMethod?.[0]?.publicKeyJwk;
		expect(jwk?.crv).toBe("secp256k1");
		expect(jwk?.x).toBeDefined();
		expect(jwk?.y).toBeDefined();
	});

	it("includes capabilityInvocation and capabilityDelegation in resolved docs", () => {
		const kp = generateKeyPair("ES256");
		const did = createDidKey(kp.publicKey, "ES256");
		const result = resolveDidKey(did);
		expect(result.didDocument?.capabilityInvocation).toHaveLength(1);
		expect(result.didDocument?.capabilityDelegation).toHaveLength(1);
	});
});
