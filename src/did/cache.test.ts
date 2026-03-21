import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DIDResolutionResult } from "../types";
import { DIDCache } from "./cache";

const baseDocument = {
	id: "did:web:example.com",
	verificationMethod: [
		{
			id: "did:web:example.com#key-0",
			type: "JsonWebKey2020",
			controller: "did:web:example.com",
			publicKeyJwk: { kty: "EC", crv: "P-256", x: "test", y: "test" },
		},
	],
};

const validResult: DIDResolutionResult = {
	didDocument: baseDocument,
	didResolutionMetadata: {},
	didDocumentMetadata: {},
};

function makeResult(id: string): DIDResolutionResult {
	return {
		didDocument: { ...baseDocument, id },
		didResolutionMetadata: {},
		didDocumentMetadata: {},
	};
}

const errorResult: DIDResolutionResult = {
	didDocument: null,
	didResolutionMetadata: { error: "notFound" },
	didDocumentMetadata: {},
};

describe("DIDCache", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns undefined for cache miss", () => {
		const cache = new DIDCache();
		expect(cache.get("did:web:example.com")).toBeUndefined();
	});

	it("stores and retrieves a successful resolution", () => {
		const cache = new DIDCache();
		cache.set("did:web:example.com", validResult);
		expect(cache.get("did:web:example.com")).toEqual(validResult);
	});

	it("does not cache failed resolutions", () => {
		const cache = new DIDCache();
		cache.set("did:web:notfound.com", errorResult);
		expect(cache.get("did:web:notfound.com")).toBeUndefined();
		expect(cache.size).toBe(0);
	});

	it("expires entries after TTL", () => {
		const cache = new DIDCache({ ttlMs: 1000 });
		cache.set("did:web:example.com", validResult);

		expect(cache.get("did:web:example.com")).toEqual(validResult);

		vi.advanceTimersByTime(1001);
		expect(cache.get("did:web:example.com")).toBeUndefined();
	});

	it("returns cached value before TTL expires", () => {
		const cache = new DIDCache({ ttlMs: 5000 });
		cache.set("did:web:example.com", validResult);

		vi.advanceTimersByTime(4999);
		expect(cache.get("did:web:example.com")).toEqual(validResult);
	});

	it("evicts oldest entry when maxEntries is reached", () => {
		const cache = new DIDCache({ maxEntries: 2 });

		const result1 = makeResult("did:web:one.com");
		const result2 = makeResult("did:web:two.com");
		const result3 = makeResult("did:web:three.com");

		cache.set("did:web:one.com", result1);
		cache.set("did:web:two.com", result2);
		expect(cache.size).toBe(2);

		cache.set("did:web:three.com", result3);
		expect(cache.size).toBe(2);

		// Oldest (one.com) should be evicted
		expect(cache.get("did:web:one.com")).toBeUndefined();
		expect(cache.get("did:web:two.com")).toEqual(result2);
		expect(cache.get("did:web:three.com")).toEqual(result3);
	});

	it("does not evict when updating an existing key", () => {
		const cache = new DIDCache({ maxEntries: 2 });

		const result1 = makeResult("did:web:one.com");
		const result2 = makeResult("did:web:two.com");

		cache.set("did:web:one.com", result1);
		cache.set("did:web:two.com", result2);

		// Update existing key — should not evict
		const updated = makeResult("did:web:one.com:updated");
		cache.set("did:web:one.com", updated);

		expect(cache.size).toBe(2);
		expect(cache.get("did:web:one.com")).toEqual(updated);
		expect(cache.get("did:web:two.com")).toEqual(result2);
	});

	it("delete removes an entry", () => {
		const cache = new DIDCache();
		cache.set("did:web:example.com", validResult);
		expect(cache.delete("did:web:example.com")).toBe(true);
		expect(cache.get("did:web:example.com")).toBeUndefined();
		expect(cache.size).toBe(0);
	});

	it("delete returns false for missing entry", () => {
		const cache = new DIDCache();
		expect(cache.delete("did:web:nope.com")).toBe(false);
	});

	it("clear removes all entries", () => {
		const cache = new DIDCache();
		cache.set("did:web:one.com", validResult);
		cache.set("did:web:two.com", validResult);
		cache.clear();
		expect(cache.size).toBe(0);
	});

	it("uses default TTL of 300_000ms", () => {
		const cache = new DIDCache();
		expect(cache.ttlMs).toBe(300_000);
	});

	it("uses default maxEntries of 100", () => {
		const cache = new DIDCache();
		expect(cache.maxEntries).toBe(100);
	});

	it("accepts custom TTL and maxEntries", () => {
		const cache = new DIDCache({ ttlMs: 60_000, maxEntries: 50 });
		expect(cache.ttlMs).toBe(60_000);
		expect(cache.maxEntries).toBe(50);
	});
});
