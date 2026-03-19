import { describe, expect, it } from "vitest";
import { createAgent } from "./agent/create";
import { generateKeyPair } from "./crypto/keys";
import { delegate } from "./delegation/issue";
import { verifyDelegation } from "./delegation/verify";
import { createDidWeb } from "./did/methods/web";
import { getAllScopes } from "./scopes/helpers";

describe("Edge cases", () => {
	// 1. Algorithm mismatch — key size doesn't match expected algorithm
	it("handles EdDSA key pairs correctly", async () => {
		const ownerKeyPair = generateKeyPair("EdDSA");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["read:email"],
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.scopes).toContain("read:email");
	});

	// 2. Scope mutation after verification — mutating result.scopes should not affect original
	it("scope mutation after verification does not affect internal state", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel", "read:email"],
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		const originalLength = result.scopes?.length ?? 0;

		// Mutate the returned scopes
		result.scopes?.push("admin:all");

		// Re-verify should return clean scopes
		const result2 = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result2.valid).toBe(true);
		expect(result2.scopes?.length).toBe(originalLength);
		expect(result2.scopes).not.toContain("admin:all");
	});

	// 3. getAllScopes returns a copy
	it("getAllScopes returns a defensive copy", () => {
		const result = {
			scopes: ["book:travel", "read:email"],
		};

		const scopes = getAllScopes(result);
		scopes.push("admin:all");

		expect(result.scopes).toHaveLength(2);
		expect(result.scopes).not.toContain("admin:all");
	});

	// 4. Delegation with single scope
	it("single scope delegation works correctly", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["single:scope"],
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.scopes).toEqual(["single:scope"]);
	});

	// 5. Agent creation with EdDSA algorithm
	it("creates agent with EdDSA algorithm", async () => {
		const agent = await createAgent({
			domain: "agent.example.com",
			algorithm: "EdDSA",
		});

		expect(agent.keyPair.algorithm).toBe("EdDSA");
		expect(agent.keyPair.publicKey.length).toBe(32);
		expect(agent.did).toBe("did:web:agent.example.com");
	});

	// 6. Verifying tampered delegation token
	it("rejects tampered delegation token", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		// Tamper with the token
		const tampered = `${delegation.token.slice(0, -10)}XXXXXXXXXX`;

		const result = await verifyDelegation(tampered, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(false);
	});

	// 7. Delegation with many scopes
	it("handles delegation with many scopes", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const manyScopes = Array.from({ length: 50 }, (_, i) => `scope:${i}`);

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: manyScopes,
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.scopes).toHaveLength(50);
	});

	// 8. Cross-algorithm rejection — ES256 delegation verified with EdDSA key
	it("rejects ES256 delegation verified with EdDSA key", async () => {
		const es256Key = generateKeyPair("ES256");
		const eddsaKey = generateKeyPair("EdDSA");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair: es256Key,
			scopes: ["book:travel"],
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: eddsaKey.publicKey,
		});

		expect(result.valid).toBe(false);
	});

	// 9. Delegation with constraints containing special characters
	it("handles constraints with special characters", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["spend:usd"],
			constraints: {
				allowedDomains: ["café.example.com", "über.example.com"],
			},
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.constraints?.allowedDomains).toContain("café.example.com");
	});

	// 10. Delegation with validFrom in the past is immediately valid
	it("delegation with validFrom in the past is valid", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			validFrom: "2020-01-01T00:00:00Z",
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
	});
});
