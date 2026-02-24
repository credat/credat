import { describe, expect, it } from "vitest";
import { createClient } from "./client";
import { ErrorCodes } from "./errors";
import { MemoryStorage } from "./storage";

describe("client revocation flow", () => {
	describe("statusList module", () => {
		it("creates a status list", async () => {
			const client = createClient({ mode: "local" });
			const list = await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			expect(list.id).toBe("list-1");
			expect(list.size).toBe(131_072);
			expect(list.bitstring.length).toBe(131_072 / 8);
		});

		it("persists status list via storage", async () => {
			const storage = new MemoryStorage();
			const client = createClient({ mode: "local", storage });

			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const retrieved = await client.statusList.get("list-1");
			expect(retrieved).not.toBeNull();
			expect(retrieved!.id).toBe("list-1");
		});

		it("returns null for nonexistent status list", async () => {
			const client = createClient({ mode: "local" });
			const result = await client.statusList.get("nonexistent");
			expect(result).toBeNull();
		});

		it("revokes and checks revocation", async () => {
			const client = createClient({ mode: "local" });
			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			expect(await client.statusList.isRevoked("list-1", 42)).toBe(false);

			await client.statusList.revoke("list-1", 42);
			expect(await client.statusList.isRevoked("list-1", 42)).toBe(true);
		});

		it("unrevokes a credential", async () => {
			const client = createClient({ mode: "local" });
			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			await client.statusList.revoke("list-1", 42);
			expect(await client.statusList.isRevoked("list-1", 42)).toBe(true);

			await client.statusList.unrevoke("list-1", 42);
			expect(await client.statusList.isRevoked("list-1", 42)).toBe(false);
		});

		it("throws when revoking on nonexistent list", async () => {
			const client = createClient({ mode: "local" });

			await expect(client.statusList.revoke("nonexistent", 0)).rejects.toThrow(
				"not found",
			);
		});

		it("exports status list as signed JWT", async () => {
			const client = createClient({ mode: "local" });
			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});
			await client.statusList.revoke("list-1", 100);

			const jwt = await client.statusList.export("list-1");
			expect(typeof jwt).toBe("string");
			expect(jwt.split(".").length).toBe(3);
		});
	});

	describe("issue with status list entry", () => {
		it("SD-JWT VC includes status list entry in issued credential", async () => {
			const client = createClient({ mode: "local" });
			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice", familyName: "Dupont" },
				format: "sd-jwt-vc",
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 42,
				},
			});

			expect(credential.statusListEntry).toEqual({
				statusListUrl: "https://issuer.example.com/status/1",
				statusListIndex: 42,
			});
		});
	});

	describe("verify with revocation check (SD-JWT VC)", () => {
		it("verifies as valid when credential is not revoked", async () => {
			const client = createClient({ mode: "local" });
			const list = await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice" },
				format: "sd-jwt-vc",
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 42,
				},
			});

			const result = await client.credentials.verify({
				credential: credential.raw,
				checkRevocation: true,
				statusList: list,
			});

			expect(result.valid).toBe(true);
			expect(result.revocationStatus).toBe("valid");
		});

		it("detects revoked credential", async () => {
			const client = createClient({ mode: "local" });
			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice" },
				format: "sd-jwt-vc",
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 42,
				},
			});

			// Revoke the credential
			await client.statusList.revoke("list-1", 42);

			// Re-fetch the list after revocation
			const updatedList = await client.statusList.get("list-1");

			const result = await client.credentials.verify({
				credential: credential.raw,
				checkRevocation: true,
				statusList: updatedList!,
			});

			expect(result.valid).toBe(false);
			expect(result.revocationStatus).toBe("revoked");
			expect(result.errors?.some((e) => e.code === ErrorCodes.REVOKED)).toBe(
				true,
			);
		});

		it("issue → revoke → unrevoke → verify as valid", async () => {
			const client = createClient({ mode: "local" });
			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice" },
				format: "sd-jwt-vc",
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 42,
				},
			});

			// Revoke
			await client.statusList.revoke("list-1", 42);
			let list = await client.statusList.get("list-1");
			let result = await client.credentials.verify({
				credential: credential.raw,
				checkRevocation: true,
				statusList: list!,
			});
			expect(result.valid).toBe(false);
			expect(result.revocationStatus).toBe("revoked");

			// Unrevoke
			await client.statusList.unrevoke("list-1", 42);
			list = await client.statusList.get("list-1");
			result = await client.credentials.verify({
				credential: credential.raw,
				checkRevocation: true,
				statusList: list!,
			});
			expect(result.valid).toBe(true);
			expect(result.revocationStatus).toBe("valid");
		});

		it("multiple credentials in same list — revoke one, other stays valid", async () => {
			const client = createClient({ mode: "local" });
			await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const credA = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice" },
				format: "sd-jwt-vc",
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 0,
				},
			});

			const credB = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Bob" },
				format: "sd-jwt-vc",
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 1,
				},
			});

			// Revoke only Alice
			await client.statusList.revoke("list-1", 0);
			const list = await client.statusList.get("list-1");

			const resultA = await client.credentials.verify({
				credential: credA.raw,
				checkRevocation: true,
				statusList: list!,
			});
			expect(resultA.valid).toBe(false);
			expect(resultA.revocationStatus).toBe("revoked");

			const resultB = await client.credentials.verify({
				credential: credB.raw,
				checkRevocation: true,
				statusList: list!,
			});
			expect(resultB.valid).toBe(true);
			expect(resultB.revocationStatus).toBe("valid");
		});
	});

	describe("backward compatibility", () => {
		it("revocationStatus is undefined when checkRevocation is not set", async () => {
			const client = createClient({ mode: "local" });

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice" },
				format: "sd-jwt-vc",
			});

			const result = await client.credentials.verify({
				credential: credential.raw,
			});

			expect(result.valid).toBe(true);
			expect(result.revocationStatus).toBeUndefined();
		});

		it("revocationStatus is unknown when checkRevocation is true but no statusList provided", async () => {
			const client = createClient({ mode: "local" });

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice" },
				format: "sd-jwt-vc",
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 42,
				},
			});

			const result = await client.credentials.verify({
				credential: credential.raw,
				checkRevocation: true,
				// no statusList provided
			});

			// Still valid (signature is good), but revocation couldn't be checked
			expect(result.valid).toBe(true);
			expect(result.revocationStatus).toBe("unknown");
		});

		it("revocationStatus is unknown when credential has no status entry but checkRevocation is true", async () => {
			const client = createClient({ mode: "local" });

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: { givenName: "Alice" },
				format: "sd-jwt-vc",
				// no statusListEntry
			});

			const list = await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const result = await client.credentials.verify({
				credential: credential.raw,
				checkRevocation: true,
				statusList: list,
			});

			expect(result.valid).toBe(true);
			expect(result.revocationStatus).toBe("unknown");
		});

		it("existing verify tests still work — issue without status list", async () => {
			const client = createClient({ mode: "local" });

			const credential = await client.credentials.issue({
				type: "KYCVerification",
				claims: { givenName: "Alice", familyName: "Dupont", nationality: "FR" },
				format: "sd-jwt-vc",
			});

			const result = await client.credentials.verify({
				credential: credential.raw,
				requiredClaims: ["givenName", "familyName"],
			});

			expect(result.valid).toBe(true);
			expect(result.claims.givenName).toBe("Alice");
			expect(result.revocationStatus).toBeUndefined();
		});
	});

	describe("selective disclosure + revocation combined", () => {
		it("SD claims work alongside revocation check", async () => {
			const client = createClient({ mode: "local" });
			const list = await client.statusList.create({
				id: "list-1",
				url: "https://issuer.example.com/status/1",
			});

			const credential = await client.credentials.issue({
				type: "KYC",
				claims: {
					givenName: "Alice",
					dateOfBirth: "1990-01-15",
					nationality: "FR",
				},
				format: "sd-jwt-vc",
				selectiveDisclosure: ["dateOfBirth", "nationality"],
				statusListEntry: {
					statusListUrl: "https://issuer.example.com/status/1",
					statusListIndex: 99,
				},
			});

			const result = await client.credentials.verify({
				credential: credential.raw,
				checkRevocation: true,
				statusList: list,
				requiredClaims: ["givenName"],
			});

			expect(result.valid).toBe(true);
			expect(result.revocationStatus).toBe("valid");
			expect(result.claims.givenName).toBe("Alice");
			// SD claims are present because all disclosures are included in the raw
			expect(result.claims.dateOfBirth).toBe("1990-01-15");
		});
	});
});
