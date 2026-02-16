import { beforeEach, describe, expect, it } from "vitest";
import { verifySignature } from "../crypto";
import { MemoryStorage } from "../storage";
import { LocalKeyManager } from "./local";

describe("LocalKeyManager", () => {
	let km: LocalKeyManager;

	beforeEach(() => {
		km = new LocalKeyManager(new MemoryStorage());
	});

	it("creates an ES256 key", async () => {
		const key = await km.createKey("issuer-key", "ES256");
		expect(key.id).toBe("issuer-key");
		expect(key.algorithm).toBe("ES256");
		expect(key.publicKey).toBeInstanceOf(Uint8Array);
	});

	it("creates an EdDSA key", async () => {
		const key = await km.createKey("ed-key", "EdDSA");
		expect(key.id).toBe("ed-key");
		expect(key.algorithm).toBe("EdDSA");
		expect(key.publicKey).toBeInstanceOf(Uint8Array);
	});

	it("retrieves a stored key", async () => {
		await km.createKey("my-key", "ES256");
		const key = await km.getKey("my-key");
		expect(key).not.toBeNull();
		expect(key?.id).toBe("my-key");
	});

	it("returns null for unknown key", async () => {
		const key = await km.getKey("nonexistent");
		expect(key).toBeNull();
	});

	it("signs data with a stored ES256 key", async () => {
		const key = await km.createKey("sign-key", "ES256");
		const payload = new TextEncoder().encode("test data");
		const signature = await km.sign("sign-key", payload);

		expect(signature).toBeInstanceOf(Uint8Array);
		expect(verifySignature(payload, signature, key.publicKey, "ES256")).toBe(
			true,
		);
	});

	it("signs data with a stored EdDSA key", async () => {
		const key = await km.createKey("ed-sign-key", "EdDSA");
		const payload = new TextEncoder().encode("test data");
		const signature = await km.sign("ed-sign-key", payload);

		expect(signature).toBeInstanceOf(Uint8Array);
		expect(verifySignature(payload, signature, key.publicKey, "EdDSA")).toBe(
			true,
		);
	});

	it("throws when signing with unknown key", async () => {
		const payload = new TextEncoder().encode("test data");
		await expect(km.sign("nonexistent", payload)).rejects.toThrow(
			"Key not found",
		);
	});

	it("lists all keys", async () => {
		await km.createKey("key-1", "ES256");
		await km.createKey("key-2", "EdDSA");
		const keys = await km.listKeys();
		expect(keys).toHaveLength(2);
	});

	it("deletes a key", async () => {
		await km.createKey("key-1", "ES256");
		const deleted = await km.deleteKey("key-1");
		expect(deleted).toBe(true);
		expect(await km.getKey("key-1")).toBeNull();
	});

	it("returns false when deleting nonexistent key", async () => {
		const deleted = await km.deleteKey("nonexistent");
		expect(deleted).toBe(false);
	});
});
