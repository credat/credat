import { describe, it, expect } from "vitest";
import { delegate } from "./issue";
import { generateKeyPair } from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";

describe("delegate", () => {
	it("issues a delegation VC as SD-JWT", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel", "read:email"],
		});

		expect(delegation.raw).toBeDefined();
		expect(delegation.raw).toContain("~"); // SD-JWT format
		expect(delegation.claims.agent).toBe(agentDid);
		expect(delegation.claims.owner).toBe(ownerDid);
		expect(delegation.claims.scopes).toEqual(["book:travel", "read:email"]);
	});

	it("includes constraints in delegation", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["spend:usd"],
			constraints: {
				maxTransactionValue: 1000,
				allowedDomains: ["airline.com"],
			},
		});

		expect(delegation.claims.constraints).toEqual({
			maxTransactionValue: 1000,
			allowedDomains: ["airline.com"],
		});
	});

	it("includes validFrom and validUntil", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			validUntil: "2026-12-31T23:59:59Z",
		});

		expect(delegation.claims.validUntil).toBe("2026-12-31T23:59:59Z");
	});

	it("throws on empty scopes", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		await expect(
			delegate({
				agent: "did:web:agent.example.com",
				owner: "did:web:owner.example.com",
				ownerKeyPair,
				scopes: [],
			}),
		).rejects.toThrow();
	});
});
