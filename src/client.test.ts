import { describe, expect, it } from "vitest";
import { createClient } from "./client";
import { CredatError } from "./errors";

describe("createClient", () => {
	it("creates a local client", () => {
		const client = createClient({ mode: "local" });
		expect(client).toBeDefined();
		expect(client.credentials).toBeDefined();
		expect(client.did).toBeDefined();
		expect(client.ai).toBeDefined();
	});

	it("throws for cloud mode (not yet available)", () => {
		expect(() => createClient({ mode: "cloud", apiKey: "test-key" })).toThrow(
			CredatError,
		);
		expect(() => createClient({ mode: "cloud", apiKey: "test-key" })).toThrow(
			"Cloud mode is not yet available",
		);
	});

	describe("credentials.issue", () => {
		it("issues an SD-JWT VC credential", async () => {
			const client = createClient({ mode: "local" });

			const credential = await client.credentials.issue({
				type: "KYCVerification",
				claims: {
					givenName: "Alice",
					familyName: "Dupont",
					dateOfBirth: "1990-01-15",
				},
				format: "sd-jwt-vc",
				selectiveDisclosure: ["dateOfBirth"],
			});

			expect(credential.id).toMatch(/^urn:uuid:/);
			expect(credential.format).toBe("sd-jwt-vc");
			expect(credential.type).toBe("KYCVerification");
			expect(credential.issuer).toMatch(/^did:key:z/);
			expect(credential.raw).toContain("~");
			expect(credential.claims.givenName).toBe("Alice");
			expect(credential.issuedAt).toBeInstanceOf(Date);
		});

		it("defaults to sd-jwt-vc format", async () => {
			const client = createClient({ mode: "local" });

			const credential = await client.credentials.issue({
				type: "Test",
				claims: { name: "test" },
			});

			expect(credential.format).toBe("sd-jwt-vc");
		});
	});

	describe("credentials.verify", () => {
		it("verifies an SD-JWT VC credential", async () => {
			const client = createClient({ mode: "local" });

			const issued = await client.credentials.issue({
				type: "KYCVerification",
				claims: {
					givenName: "Alice",
					familyName: "Dupont",
					nationality: "FR",
				},
				format: "sd-jwt-vc",
			});

			const result = await client.credentials.verify({
				credential: issued.raw,
				requiredClaims: ["givenName", "familyName"],
			});

			expect(result.valid).toBe(true);
			expect(result.format).toBe("sd-jwt-vc");
			expect(result.claims.givenName).toBe("Alice");
			expect(result.claims.familyName).toBe("Dupont");
			expect(result.issuer).toMatch(/^did:key:z/);
		});

		it("reports missing required claims", async () => {
			const client = createClient({ mode: "local" });

			const issued = await client.credentials.issue({
				type: "Test",
				claims: { name: "test" },
				format: "sd-jwt-vc",
			});

			const result = await client.credentials.verify({
				credential: issued.raw,
				requiredClaims: ["name", "missingClaim"],
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toBeDefined();
			expect(
				result.errors?.some((e) => e.message.includes("missingClaim")),
			).toBe(true);
		});

		it("verifies with selective disclosure", async () => {
			const client = createClient({ mode: "local" });

			const issued = await client.credentials.issue({
				type: "KYC",
				claims: {
					givenName: "Alice",
					dateOfBirth: "1990-01-15",
					nationality: "FR",
				},
				format: "sd-jwt-vc",
				selectiveDisclosure: ["dateOfBirth"],
			});

			const result = await client.credentials.verify({
				credential: issued.raw,
				requiredClaims: ["givenName"],
			});

			expect(result.valid).toBe(true);
			expect(result.claims.givenName).toBe("Alice");
			// dateOfBirth is in the disclosure, so it's present when all disclosures are sent
			expect(result.claims.dateOfBirth).toBe("1990-01-15");
		});
	});

	describe("did.create", () => {
		it("creates a did:key", async () => {
			const client = createClient({ mode: "local" });
			const did = await client.did.create({ method: "key" });

			expect(did).toMatch(/^did:key:z/);
		});

		it("creates a did:web", async () => {
			const client = createClient({ mode: "local" });
			const did = await client.did.create({
				method: "web",
				domain: "example.com",
			});

			expect(did).toBe("did:web:example.com");
		});

		it("throws for did:web without domain", async () => {
			const client = createClient({ mode: "local" });

			await expect(client.did.create({ method: "web" })).rejects.toThrow(
				"Domain is required for did:web",
			);
		});

		it("throws for unsupported method in local mode", async () => {
			const client = createClient({ mode: "local" });

			await expect(
				client.did.create({ method: "ebsi" as "key" }),
			).rejects.toThrow("cannot be created locally");
		});
	});

	describe("did.resolve", () => {
		it("resolves a did:key", async () => {
			const client = createClient({ mode: "local" });
			const did = await client.did.create({ method: "key" });
			const resolution = await client.did.resolve(did);

			expect(resolution.didDocument).not.toBeNull();
			expect(resolution.didDocument?.id).toBe(did);
			expect(resolution.didDocument?.verificationMethod).toHaveLength(1);
		});
	});

	describe("ai module", () => {
		it("throws when AI is not configured", async () => {
			const client = createClient({ mode: "local" });

			await expect(client.ai.generateSchema("test")).rejects.toThrow(
				"AI features require configuration",
			);
		});

		it("throws when AI is not configured for explainError", async () => {
			const client = createClient({ mode: "local" });

			await expect(
				client.ai.explainError({ code: "TEST", message: "test" }),
			).rejects.toThrow("AI features require configuration");
		});

		it("throws when AI is not configured for generateTestFixtures", async () => {
			const client = createClient({ mode: "local" });

			await expect(
				client.ai.generateTestFixtures({
					type: "Test",
					claims: {},
					format: "sd-jwt-vc",
				}),
			).rejects.toThrow("AI features require configuration");
		});
	});
});

describe("full issue → verify flow", () => {
	it("round-trips an SD-JWT VC credential", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "KYCVerification",
			claims: {
				givenName: "Marie",
				familyName: "Leclerc",
				dateOfBirth: "1985-03-22",
				nationality: "FR",
				verificationLevel: "high",
			},
			format: "sd-jwt-vc",
			selectiveDisclosure: ["dateOfBirth", "nationality"],
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
			requiredClaims: ["givenName", "familyName", "verificationLevel"],
		});

		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Marie");
		expect(result.claims.familyName).toBe("Leclerc");
		expect(result.claims.verificationLevel).toBe("high");
	});
});
