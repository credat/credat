import { beforeEach, describe, expect, it, vi } from "vitest";
import { DIDError, ErrorCodes } from "../../errors";
import { DIDCache } from "../cache";
import { createDidWeb, didWebToUrl, resolveDidWeb } from "./web";

describe("didWebToUrl", () => {
	it("converts did:web:example.com to https://example.com/.well-known/did.json", () => {
		expect(didWebToUrl("did:web:example.com")).toBe(
			"https://example.com/.well-known/did.json",
		);
	});

	it("converts did:web:example.com:path to https://example.com/path/did.json", () => {
		expect(didWebToUrl("did:web:example.com:user:123")).toBe(
			"https://example.com/user/123/did.json",
		);
	});

	it("handles port-encoded colons", () => {
		expect(didWebToUrl("did:web:example.com%3A8443")).toBe(
			"https://example.com:8443/.well-known/did.json",
		);
	});
});

describe("createDidWeb", () => {
	it("creates did:web from domain", () => {
		const did = createDidWeb("example.com");
		expect(did).toBe("did:web:example.com");
	});

	it("creates did:web with path", () => {
		const did = createDidWeb("example.com", "users/123");
		expect(did).toBe("did:web:example.com:users:123");
	});
});

describe("resolveDidWeb", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("resolves a valid did:web by fetching the URL", async () => {
		const mockDocument = {
			id: "did:web:example.com",
			verificationMethod: [
				{
					id: "did:web:example.com#key-1",
					type: "JsonWebKey2020",
					controller: "did:web:example.com",
					publicKeyJwk: { kty: "EC", crv: "P-256", x: "test", y: "test" },
				},
			],
		};

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockDocument),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:example.com");
		expect(result.didDocument).toEqual(mockDocument);
		expect(fetch).toHaveBeenCalledWith(
			"https://example.com/.well-known/did.json",
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it("returns error for HTTP failure", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:notfound.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("notFound");
	});

	// === Issue #7: Timeout tests ===

	it("throws DIDError on timeout", async () => {
		global.fetch = vi.fn().mockImplementation((_url, options) => {
			return new Promise((_resolve, reject) => {
				const signal = options?.signal as AbortSignal | undefined;
				if (signal) {
					signal.addEventListener("abort", () => {
						const err = new Error("The operation was aborted");
						err.name = "AbortError";
						reject(err);
					});
				}
			});
		}) as unknown as typeof fetch;

		await expect(
			resolveDidWeb("did:web:slow.example.com", { timeout: 10 }),
		).rejects.toThrow(DIDError);

		await expect(
			resolveDidWeb("did:web:slow.example.com", { timeout: 10 }),
		).rejects.toThrow(/timed out/);
	});

	it("timeout error includes URL and timeout value", async () => {
		global.fetch = vi.fn().mockImplementation((_url, options) => {
			return new Promise((_resolve, reject) => {
				const signal = options?.signal as AbortSignal | undefined;
				if (signal) {
					signal.addEventListener("abort", () => {
						const err = new Error("The operation was aborted");
						err.name = "AbortError";
						reject(err);
					});
				}
			});
		}) as unknown as typeof fetch;

		try {
			await resolveDidWeb("did:web:slow.example.com", { timeout: 50 });
			expect.fail("Should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(DIDError);
			const err = e as DIDError;
			expect(err.code).toBe(ErrorCodes.DID_RESOLUTION_FAILED);
			expect(err.message).toContain("50ms");
			expect(err.message).toContain("slow.example.com");
		}
	});

	it("resolves normally when server responds within timeout", async () => {
		const mockDocument = {
			id: "did:web:fast.example.com",
		};

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockDocument),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:fast.example.com", {
			timeout: 5000,
		});
		expect(result.didDocument).toEqual(mockDocument);
	});

	it("uses default 10s timeout when not specified", async () => {
		const mockDocument = { id: "did:web:example.com" };

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockDocument),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:example.com");
		expect(result.didDocument).toEqual(mockDocument);
	});

	// === Issue #15: Error scenario tests ===

	it("returns networkError for HTTP 500 response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:error.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("networkError");
	});

	it("returns invalidDidDocument for malformed JSON response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ notADid: true }),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:malformed.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("invalidDidDocument");
	});

	it("returns error for non-JSON response body", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.reject(new Error("Unexpected token")),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:badjson.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toContain("networkError");
	});

	it("returns error for connection refused / DNS failure", async () => {
		global.fetch = vi
			.fn()
			.mockRejectedValue(
				new TypeError("fetch failed: ECONNREFUSED"),
			) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:unreachable.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toContain("networkError");
		expect(result.didResolutionMetadata.error).toContain("ECONNREFUSED");
	});

	it("returns error for empty response body", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(null),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:empty.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("invalidDidDocument");
	});

	it("returns invalidDidDocument for DID document missing id field", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({ verificationMethod: [], authentication: [] }),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:noid.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("invalidDidDocument");
	});

	it("returns invalidDidDocument when id is not a DID", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "not-a-did" }),
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:badid.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("invalidDidDocument");
	});

	it("returns networkError for HTTP 503 response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 503,
		}) as unknown as typeof fetch;

		const result = await resolveDidWeb("did:web:unavailable.example.com");
		expect(result.didDocument).toBeNull();
		expect(result.didResolutionMetadata.error).toBe("networkError");
	});

	// === Issue #18: Cache integration tests ===

	it("returns cached result on second call", async () => {
		const mockDocument = { id: "did:web:cached.example.com" };

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockDocument),
		}) as unknown as typeof fetch;

		const cache = new DIDCache({ ttlMs: 60_000 });

		const result1 = await resolveDidWeb("did:web:cached.example.com", {
			cache,
		});
		const result2 = await resolveDidWeb("did:web:cached.example.com", {
			cache,
		});

		expect(result1.didDocument).toEqual(mockDocument);
		expect(result2.didDocument).toEqual(mockDocument);
		// fetch should only be called once — second call served from cache
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("does not cache failed resolutions", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
		}) as unknown as typeof fetch;

		const cache = new DIDCache({ ttlMs: 60_000 });

		await resolveDidWeb("did:web:notfound.com", { cache });
		await resolveDidWeb("did:web:notfound.com", { cache });

		// Both calls should hit the network
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it("resolves without cache (backwards-compatible)", async () => {
		const mockDocument = { id: "did:web:example.com" };

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockDocument),
		}) as unknown as typeof fetch;

		// No cache option — should work exactly as before
		const result = await resolveDidWeb("did:web:example.com");
		expect(result.didDocument).toEqual(mockDocument);
	});
});
