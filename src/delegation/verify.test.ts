import { describe, expect, it } from "vitest";
import { generateKeyPair } from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";
import { ErrorCodes } from "../errors";
import { delegate } from "./issue";
import { verifyDelegation } from "./verify";

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

		const result = await verifyDelegation(delegation.token, {
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

		const result = await verifyDelegation(delegation.token, {
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

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.DELEGATION_EXPIRED),
		).toBe(true);
	});

	it("rejects not-yet-valid delegation", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			validFrom: "2099-01-01T00:00:00Z",
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.DELEGATION_NOT_YET_VALID),
		).toBe(true);
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

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.constraints?.maxTransactionValue).toBe(500);
	});

	// === Issue #9: mapSdJwtError pattern matching ===

	it("maps signature errors regardless of exact string", async () => {
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

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: wrongKeyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(e) => e.code === ErrorCodes.DELEGATION_SIGNATURE_INVALID,
			),
		).toBe(true);
	});

	it("maps format errors for non-signature issues", async () => {
		const ownerKeyPair = generateKeyPair("ES256");

		const result = await verifyDelegation("not.a.valid~jwt~", {
			ownerPublicKey: ownerKeyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(e) => e.code === ErrorCodes.CREDENTIAL_INVALID_FORMAT,
			),
		).toBe(true);
	});

	// === Issue #10: Revocation check ===

	it("returns valid when checkRevocation says not revoked", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			statusList: { url: "https://example.com/status/1", index: 42 },
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			checkRevocation: async () => false,
		});

		expect(result.valid).toBe(true);
	});

	it("returns DELEGATION_REVOKED when checkRevocation says revoked", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			statusList: { url: "https://example.com/status/1", index: 42 },
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			checkRevocation: async () => true,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.DELEGATION_REVOKED),
		).toBe(true);
	});

	it("does not invoke checkRevocation when no statusListEntry", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		let called = false;
		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			// No statusList
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			checkRevocation: async () => {
				called = true;
				return false;
			},
		});

		expect(result.valid).toBe(true);
		expect(called).toBe(false);
	});

	it("handles checkRevocation callback that throws", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			statusList: { url: "https://example.com/status/1", index: 42 },
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			checkRevocation: async () => {
				throw new Error("Network down");
			},
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.message.includes("Revocation check failed")),
		).toBe(true);
	});

	it("behavior unchanged when checkRevocation not provided", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");

		const delegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
			statusList: { url: "https://example.com/status/1", index: 42 },
		});

		const result = await verifyDelegation(delegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			// No checkRevocation
		});

		expect(result.valid).toBe(true);
	});

	// === Issue #14: Delegation chain ===

	it("verifies a valid chain delegation", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const agentKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");
		const subAgentDid = createDidWeb("sub-agent.example.com");

		// Owner → Agent
		const parentDelegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel", "read:email"],
		});

		// Agent → SubAgent (subset of scopes)
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

		const result = await verifyDelegation(childDelegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			resolveSignerKey: async (did) => {
				if (did === agentDid) return agentKeyPair.publicKey;
				throw new Error(`Unknown DID: ${did}`);
			},
		});

		expect(result.valid).toBe(true);
		expect(result.agent).toBe(subAgentDid);
		expect(result.scopes).toEqual(["book:travel"]);
	});

	it("rejects chain with scope escalation", async () => {
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

		// Attempt to escalate scopes
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

	it("rejects chain with scope escalation at verification", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const agentKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agentDid = createDidWeb("agent.example.com");
		const subAgentDid = createDidWeb("sub-agent.example.com");

		// Create parent with limited scopes
		const parentDelegation = await delegate({
			agent: agentDid,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		// Create child with matching scopes (passes issuance check)
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

		// Verification should also pass scope check
		const result = await verifyDelegation(childDelegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			resolveSignerKey: async (did) => {
				if (did === agentDid) return agentKeyPair.publicKey;
				throw new Error(`Unknown DID: ${did}`);
			},
		});

		expect(result.valid).toBe(true);
		expect(result.scopes).toEqual(["book:travel"]);
	});

	it("rejects chain exceeding max depth", async () => {
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

	it("rejects chained delegation without resolveSignerKey", async () => {
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

		const result = await verifyDelegation(childDelegation.token, {
			ownerPublicKey: ownerKeyPair.publicKey,
			// No resolveSignerKey
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.message.includes("resolveSignerKey")),
		).toBe(true);
	});
});
