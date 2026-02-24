import { describe, it, expect } from "vitest";
import { delegate } from "./issue";
import { verifyDelegation } from "./verify";
import { generateKeyPair } from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";

describe("verifyDelegation", () => {
	it("verifies a valid delegation VC", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel", "read:email"],
		});

		const result = await verifyDelegation(delegation.raw, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.agent).toBe(agentDid);
		expect(result.owner).toBe(ownerDid);
		expect(result.scopes).toContain("book:travel");
		expect(result.scopes).toContain("read:email");
		expect(result.errors).toHaveLength(0);
	});

	it("rejects delegation with wrong key", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const wrongKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const result = await verifyDelegation(delegation.raw, {
			ownerPublicKey: wrongKeyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("rejects expired delegation", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			validUntil: "2020-01-01T00:00:00Z",
		});

		const result = await verifyDelegation(delegation.raw, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.code === "DELEGATION_EXPIRED")).toBe(true);
	});

	it("extracts constraints from delegation", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["spend:usd"],
			constraints: { maxTransactionValue: 500 },
		});

		const result = await verifyDelegation(delegation.raw, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.constraints?.maxTransactionValue).toBe(500);
	});
});
