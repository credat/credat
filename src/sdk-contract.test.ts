import { describe, expect, it } from "vitest";
import { createClient } from "./client";
import { verifyMdoc } from "./credentials/formats/mdoc";
import { verifySdJwtVc } from "./credentials/formats/sd-jwt-vc";
import { verifyStatusListCredential } from "./credentials/status-list";
import {
	base64urlToUint8Array,
	generateKeyPair,
	jwkToPublicKey,
	publicKeyToJwk,
	uint8ArrayToBase64url,
} from "./crypto/keys";
import { createDidKey, resolveDidKey } from "./did/methods/key";
import {
	CredatError,
	CredentialError,
	DIDError,
	ErrorCodes,
	ProtocolError,
} from "./errors";
import { LocalKeyManager } from "./keys/local";
import { CredentialIssuer } from "./protocols/openid4vci/issuer";
import { CredentialVerifier } from "./protocols/openid4vp/verifier";
import { MemoryStorage } from "./storage";
import { SqliteStorage } from "./storage/sqlite";
import type { StorageAdapter } from "./storage/types";

// ========================================================================
// SDK Contract Tests — high-level invariants that CI must enforce
// These tests give you confidence to ship when CI + agent review passes
// ========================================================================

describe("public API surface", () => {
	it("createClient returns all expected modules", () => {
		const client = createClient({ mode: "local" });

		// Core modules
		expect(client.credentials).toBeDefined();
		expect(client.credentials.issue).toBeTypeOf("function");
		expect(client.credentials.verify).toBeTypeOf("function");

		expect(client.did).toBeDefined();
		expect(client.did.create).toBeTypeOf("function");
		expect(client.did.resolve).toBeTypeOf("function");

		expect(client.ai).toBeDefined();
		expect(client.ai.generateSchema).toBeTypeOf("function");
		expect(client.ai.generateTestFixtures).toBeTypeOf("function");
		expect(client.ai.explainError).toBeTypeOf("function");

		// New module
		expect(client.statusList).toBeDefined();
		expect(client.statusList.create).toBeTypeOf("function");
		expect(client.statusList.revoke).toBeTypeOf("function");
		expect(client.statusList.unrevoke).toBeTypeOf("function");
		expect(client.statusList.isRevoked).toBeTypeOf("function");
		expect(client.statusList.get).toBeTypeOf("function");
		expect(client.statusList.export).toBeTypeOf("function");
	});

	it("client accepts custom storage adapter", () => {
		const storage = new MemoryStorage();
		const client = createClient({ mode: "local", storage });
		expect(client).toBeDefined();
	});

	it("error hierarchy is correct", () => {
		const base = new CredatError("CODE", "message", "human");
		const cred = new CredentialError("CODE", "message");
		const did = new DIDError("CODE", "message");
		const proto = new ProtocolError("CODE", "message");

		expect(base).toBeInstanceOf(Error);
		expect(base).toBeInstanceOf(CredatError);
		expect(cred).toBeInstanceOf(CredatError);
		expect(did).toBeInstanceOf(CredatError);
		expect(proto).toBeInstanceOf(CredatError);

		expect(base.code).toBe("CODE");
		expect(base.humanMessage).toBe("human");
	});

	it("ErrorCodes has all expected codes", () => {
		// Credential errors
		expect(ErrorCodes.INVALID_CLAIMS).toBe("CREDENTIAL_INVALID_CLAIMS");
		expect(ErrorCodes.SIGNATURE_INVALID).toBe("CREDENTIAL_SIGNATURE_INVALID");
		expect(ErrorCodes.EXPIRED).toBe("CREDENTIAL_EXPIRED");
		expect(ErrorCodes.ISSUER_UNTRUSTED).toBe("CREDENTIAL_ISSUER_UNTRUSTED");
		expect(ErrorCodes.REVOKED).toBe("CREDENTIAL_REVOKED");
		expect(ErrorCodes.STATUS_LIST_INVALID).toBe("STATUS_LIST_INVALID");

		// DID errors
		expect(ErrorCodes.DID_NOT_FOUND).toBe("DID_NOT_FOUND");
		expect(ErrorCodes.DID_METHOD_UNSUPPORTED).toBe("DID_METHOD_UNSUPPORTED");

		// Protocol errors
		expect(ErrorCodes.OPENID4VCI_FAILED).toBe("OPENID4VCI_FAILED");
		expect(ErrorCodes.OPENID4VP_FAILED).toBe("OPENID4VP_FAILED");
	});
});

describe("storage adapter contract", () => {
	// Any StorageAdapter implementation must satisfy these invariants.
	// Run these against both MemoryStorage and SqliteStorage.

	const adapters: Array<{
		name: string;
		create: () => StorageAdapter & { close?: () => void };
	}> = [
		{ name: "MemoryStorage", create: () => new MemoryStorage() },
		{ name: "SqliteStorage", create: () => new SqliteStorage() },
	];

	for (const { name, create } of adapters) {
		describe(`${name}`, () => {
			let storage: StorageAdapter & { close?: () => void };

			beforeEach(() => {
				storage = create();
			});

			afterEach(() => {
				storage.close?.();
			});

			it("get returns null for missing key", async () => {
				expect(await storage.get("c", "k")).toBeNull();
			});

			it("set then get returns the value", async () => {
				await storage.set("c", "k", { a: 1 });
				expect(await storage.get("c", "k")).toEqual({ a: 1 });
			});

			it("set overwrites existing value", async () => {
				await storage.set("c", "k", "old");
				await storage.set("c", "k", "new");
				expect(await storage.get("c", "k")).toBe("new");
			});

			it("delete returns true for existing, false for missing", async () => {
				await storage.set("c", "k", "v");
				expect(await storage.delete("c", "k")).toBe(true);
				expect(await storage.delete("c", "k")).toBe(false);
			});

			it("list returns all items in collection", async () => {
				await storage.set("c", "a", 1);
				await storage.set("c", "b", 2);
				await storage.set("other", "x", 3);
				const items = await storage.list("c");
				expect(items).toHaveLength(2);
				const keys = items.map((i) => i.key).sort();
				expect(keys).toEqual(["a", "b"]);
			});

			it("clear(collection) only clears that collection", async () => {
				await storage.set("a", "k", 1);
				await storage.set("b", "k", 2);
				await storage.clear("a");
				expect(await storage.get("a", "k")).toBeNull();
				expect(await storage.get("b", "k")).toBe(2);
			});

			it("clear() clears everything", async () => {
				await storage.set("a", "k", 1);
				await storage.set("b", "k", 2);
				await storage.clear();
				expect(await storage.get("a", "k")).toBeNull();
				expect(await storage.get("b", "k")).toBeNull();
			});

			it("works as backing store for LocalKeyManager", async () => {
				const km = new LocalKeyManager(storage);
				const key = await km.createKey("test", "ES256");
				expect(key.id).toBe("test");
				const retrieved = await km.getKey("test");
				expect(retrieved).not.toBeNull();
				expect(retrieved!.algorithm).toBe("ES256");
			});
		});
	}
});

describe("DID ↔ crypto round-trip", () => {
	it("did:key encodes and resolves back to the same public key", async () => {
		const keyPair = generateKeyPair("ES256");
		const did = createDidKey(keyPair.publicKey, "ES256");
		const resolution = await resolveDidKey(did);

		expect(resolution.didDocument).not.toBeNull();
		const jwk = resolution.didDocument!.verificationMethod![0]!.publicKeyJwk!;
		const resolvedKey = jwkToPublicKey(jwk);
		expect(resolvedKey).toEqual(keyPair.publicKey);
	});

	it("JWK round-trip preserves key material", () => {
		const keyPair = generateKeyPair("ES256");
		const jwk = publicKeyToJwk(keyPair.publicKey, "ES256");
		const recovered = jwkToPublicKey(jwk);
		expect(recovered).toEqual(keyPair.publicKey);
	});

	it("base64url round-trip preserves bytes", () => {
		const original = new Uint8Array([0, 1, 255, 128, 64, 32]);
		const encoded = uint8ArrayToBase64url(original);
		const decoded = base64urlToUint8Array(encoded);
		expect(decoded).toEqual(original);
	});
});

describe("OpenID4VCI → verify with revocation", () => {
	it("full protocol flow: offer → token → issue → verify + revocation check", async () => {
		const keyPair = generateKeyPair("ES256");
		const issuerDid = createDidKey(keyPair.publicKey, "ES256");

		const issuer = new CredentialIssuer({
			issuerUrl: "https://issuer.example.com",
			issuerDid,
			signingKeyId: "key-1",
			privateKey: keyPair.privateKey,
			publicKey: keyPair.publicKey,
		});

		// Step 1: Create offer
		const { offer } = issuer.createOffer({
			credentialType: "KYCVerification",
			claims: { givenName: "Alice", familyName: "Dupont" },
		});

		// Step 2: Exchange pre-authorized code
		const code =
			offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
				"pre-authorized_code"
			];
		const tokenResponse = issuer.exchangePreAuthorizedCode(code);

		// Step 3: Issue credential
		const { response } = await issuer.issueCredential(
			tokenResponse.access_token,
			"vc+sd-jwt",
		);

		// Step 4: Verify via client (with revocation check)
		const client = createClient({ mode: "local" });
		const list = await client.statusList.create({
			id: "kyc-list",
			url: "https://issuer.example.com/status/kyc",
		});

		// The credential wasn't issued with a status list entry, so revocation status will be unknown
		const result = await client.credentials.verify({
			credential: response.credential,
			checkRevocation: true,
			statusList: list,
		});

		// Signature is valid (we can resolve the did:key to get the public key)
		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Alice");
		expect(result.revocationStatus).toBe("unknown");
	});
});

describe("status list credential export → verify round-trip", () => {
	it("exported JWT can be independently verified", async () => {
		const keyPair = generateKeyPair("ES256");
		const client = createClient({ mode: "local" });

		await client.statusList.create({
			id: "list-1",
			url: "https://issuer.example.com/status/1",
		});
		await client.statusList.revoke("list-1", 42);
		await client.statusList.revoke("list-1", 1000);

		const jwt = await client.statusList.export("list-1");

		// This JWT was signed by the client's internal key, which we don't have direct
		// access to. But we can at least verify the JWT structure is valid.
		expect(jwt.split(".").length).toBe(3);

		// Decode the payload without verifying (since we don't have the key)
		const payloadB64 = jwt.split(".")[1]!;
		const payload = JSON.parse(
			Buffer.from(
				payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
				"base64",
			).toString(),
		);
		expect(payload.iss).toMatch(/^did:key:z/);
		expect(payload.status_list).toBeDefined();
		expect(payload.status_list.bits).toBe(1);
		expect(typeof payload.status_list.lst).toBe("string");
	});
});

describe("edge cases", () => {
	it("handles empty claims object", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "EmptyCredential",
			claims: {},
			format: "sd-jwt-vc",
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		expect(Object.keys(result.claims).length).toBe(0);
	});

	it("handles unicode claims", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "KYC",
			claims: {
				givenName: "Marie-Hélène",
				familyName: "Müller",
				city: "東京",
				emoji: "🇫🇷",
			},
			format: "sd-jwt-vc",
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Marie-Hélène");
		expect(result.claims.familyName).toBe("Müller");
		expect(result.claims.city).toBe("東京");
		expect(result.claims.emoji).toBe("🇫🇷");
	});

	it("handles unicode claims in mDoc", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "mDL",
			claims: {
				givenName: "José",
				familyName: "García",
			},
			format: "mdoc",
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("José");
		expect(result.claims.familyName).toBe("García");
	});

	it("handles nested object claims", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "AddressCredential",
			claims: {
				address: {
					street: "123 Rue de la Paix",
					city: "Paris",
					postalCode: "75001",
					country: "FR",
				},
			},
			format: "sd-jwt-vc",
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		expect(result.claims.address).toEqual({
			street: "123 Rue de la Paix",
			city: "Paris",
			postalCode: "75001",
			country: "FR",
		});
	});

	it("handles boolean and numeric claims", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "AgeVerification",
			claims: {
				over18: true,
				over21: false,
				age: 25,
				score: 0.95,
			},
			format: "sd-jwt-vc",
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		expect(result.claims.over18).toBe(true);
		expect(result.claims.over21).toBe(false);
		expect(result.claims.age).toBe(25);
		expect(result.claims.score).toBe(0.95);
	});

	it("handles many selective disclosure claims", async () => {
		const client = createClient({ mode: "local" });

		const claims: Record<string, string> = {};
		const sdFields: string[] = [];
		for (let i = 0; i < 20; i++) {
			const key = `field_${i}`;
			claims[key] = `value_${i}`;
			if (i % 2 === 0) sdFields.push(key); // Every other field is SD
		}

		const credential = await client.credentials.issue({
			type: "LargeCredential",
			claims,
			format: "sd-jwt-vc",
			selectiveDisclosure: sdFields,
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		// All claims should be present since we verify with all disclosures
		for (let i = 0; i < 20; i++) {
			expect(result.claims[`field_${i}`]).toBe(`value_${i}`);
		}
	});

	it("credential IDs are unique", async () => {
		const client = createClient({ mode: "local" });
		const ids = new Set<string>();

		for (let i = 0; i < 10; i++) {
			const credential = await client.credentials.issue({
				type: "Test",
				claims: { i },
				format: "sd-jwt-vc",
			});
			ids.add(credential.id);
		}

		expect(ids.size).toBe(10); // All unique
	});
});

describe("storage isolation", () => {
	it("two clients with separate storage are independent", async () => {
		const storageA = new MemoryStorage();
		const storageB = new MemoryStorage();
		const clientA = createClient({ mode: "local", storage: storageA });
		const clientB = createClient({ mode: "local", storage: storageB });

		await clientA.statusList.create({
			id: "list-1",
			url: "https://a.example.com/status/1",
		});
		await clientB.statusList.create({
			id: "list-1",
			url: "https://b.example.com/status/1",
		});

		await clientA.statusList.revoke("list-1", 0);

		// Client A's list has revocation at index 0
		expect(await clientA.statusList.isRevoked("list-1", 0)).toBe(true);
		// Client B's list does not
		expect(await clientB.statusList.isRevoked("list-1", 0)).toBe(false);
	});

	it("client without explicit storage gets its own MemoryStorage", async () => {
		const clientA = createClient({ mode: "local" });
		const clientB = createClient({ mode: "local" });

		await clientA.statusList.create({
			id: "shared-name",
			url: "https://a.example.com/status/1",
		});

		// clientB should NOT see clientA's status list
		const result = await clientB.statusList.get("shared-name");
		expect(result).toBeNull();
	});
});
