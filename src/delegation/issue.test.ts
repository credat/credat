import { describe, expect, it } from "vitest";
import { generateKeyPair } from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";
import { delegate } from "./issue";

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

		expect(delegation.token).toBeDefined();
		expect(delegation.token).toContain("~"); // SD-JWT format
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

	// === Issue #14: Chain delegation issuance ===

	it("issues a chain delegation with parentDelegation", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const agentKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");
		const subAgentDid = createDidWeb("sub-agent.example.com");

		const parentDelegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel", "read:email"],
		});

		const childDelegation = await delegate({
			agent: subAgentDid,
			owner: agentDid,
			ownerKeyPair: agentKeyPair,
			scopes: ["book:travel"],
			parentDelegation: {
				token: parentDelegation.token,
				parentOwnerPublicKey: ownerKeyPair.publicKey,
			},
		});

		expect(childDelegation.token).toBeDefined();
		expect(childDelegation.token).toContain("~");
		expect(childDelegation.claims.agent).toBe(subAgentDid);
		expect(childDelegation.claims.scopes).toEqual(["book:travel"]);
	});

	it("rejects chain delegation with scope escalation", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const agentKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");
		const subAgentDid = createDidWeb("sub-agent.example.com");

		const parentDelegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		await expect(
			delegate({
				agent: subAgentDid,
				owner: agentDid,
				ownerKeyPair: agentKeyPair,
				scopes: ["book:travel", "admin:all"],
				parentDelegation: {
					token: parentDelegation.token,
					parentOwnerPublicKey: ownerKeyPair.publicKey,
				},
			}),
		).rejects.toThrow(/not in parent/i);
	});

	it("rejects chain delegation exceeding max depth", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const agentKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");
		const subAgentDid = createDidWeb("sub-agent.example.com");

		const parentDelegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		await expect(
			delegate({
				agent: subAgentDid,
				owner: agentDid,
				ownerKeyPair: agentKeyPair,
				scopes: ["book:travel"],
				parentDelegation: {
					token: parentDelegation.token,
					parentOwnerPublicKey: ownerKeyPair.publicKey,
				},
				maxChainDepth: 0,
			}),
		).rejects.toThrow(/chain depth/i);
	});

	it("rejects chain delegation with invalid parent token", async () => {
		const agentKeyPair = generateKeyPair("ES256");
		const ownerKeyPair = generateKeyPair("ES256");
		const agentDid = createDidWeb("agent.example.com");
		const subAgentDid = createDidWeb("sub-agent.example.com");

		await expect(
			delegate({
				agent: subAgentDid,
				owner: agentDid,
				ownerKeyPair: agentKeyPair,
				scopes: ["book:travel"],
				parentDelegation: {
					token: "invalid.token.here~",
					parentOwnerPublicKey: ownerKeyPair.publicKey,
				},
			}),
		).rejects.toThrow(/parent delegation is invalid/i);
	});
});
