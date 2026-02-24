import { describe, expect, it } from "vitest";
import {
	createAgent,
	createChallenge,
	createDidWeb,
	delegate,
	ErrorCodes,
	generateKeyPair,
	hasAllScopes,
	hasScope,
	presentCredentials,
	verifyPresentation,
} from "../../src/index";

describe("E2E: Full delegation + handshake flow", () => {
	it("complete flow: create agent -> delegate -> handshake -> verify", async () => {
		// 1. Owner creates key pair + DID
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		// 2. Agent is created
		const agent = await createAgent({ domain: "agent.example.com" });

		// 3. Owner delegates to agent with scopes and constraints
		const constraints = {
			maxTransactionValue: 1000,
			allowedDomains: ["shop.example.com"],
			rateLimit: 10,
		};
		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["purchase:item", "read:catalog", "write:cart"],
			constraints,
			validFrom: new Date().toISOString(),
			validUntil: new Date(Date.now() + 3600_000).toISOString(),
		});

		// 4. Service challenges the agent
		const serviceDid = "did:web:service.example.com";
		const challenge = createChallenge({ from: serviceDid });

		// 5. Agent presents credentials
		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.raw,
			agent,
		});

		// 6. Service verifies the presentation
		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		// 7. Assertions
		expect(result.valid).toBe(true);
		expect(result.agent).toBe(agent.did);
		expect(result.owner).toBe(ownerDid);
		expect(result.errors).toHaveLength(0);

		// Scope checks
		expect(hasScope(result, "purchase:item")).toBe(true);
		expect(hasScope(result, "read:catalog")).toBe(true);
		expect(hasScope(result, "write:cart")).toBe(true);
		expect(hasScope(result, "delete:account")).toBe(false);
		expect(hasAllScopes(result, ["purchase:item", "read:catalog"])).toBe(true);
		expect(hasAllScopes(result, ["purchase:item", "admin:all"])).toBe(false);

		// Constraints
		expect(result.constraints).toBeDefined();
		expect(result.constraints?.maxTransactionValue).toBe(1000);
		expect(result.constraints?.allowedDomains).toEqual(["shop.example.com"]);
		expect(result.constraints?.rateLimit).toBe(10);
	});

	it("revocation flow: expired delegation is rejected", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agent = await createAgent({ domain: "agent.example.com" });

		// Delegate with a past validUntil (already expired)
		const pastDate = new Date(Date.now() - 60_000).toISOString();
		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["read:data"],
			validUntil: pastDate,
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });
		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.raw,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.DELEGATION_EXPIRED),
		).toBe(true);
	});

	it("cross-algorithm: EdDSA agent with ES256 owner", async () => {
		// Owner uses ES256
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		// Agent uses EdDSA
		const agent = await createAgent({
			domain: "agent.example.com",
			algorithm: "EdDSA",
		});

		expect(agent.keyPair.algorithm).toBe("EdDSA");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["read:data", "write:data"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });
		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.raw,
			agent,
		});

		// Verify with explicit agentAlgorithm since agent uses EdDSA
		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
			agentAlgorithm: "EdDSA",
		});

		expect(result.valid).toBe(true);
		expect(result.agent).toBe(agent.did);
		expect(result.owner).toBe(ownerDid);
		expect(result.scopes).toContain("read:data");
		expect(result.scopes).toContain("write:data");
	});

	it("replay attack: mismatched challenge nonce is rejected", async () => {
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");
		const agent = await createAgent({ domain: "agent.example.com" });

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["read:data"],
		});

		// Agent presents with one challenge
		const originalChallenge = createChallenge({
			from: "did:web:service.example.com",
		});
		const presentation = await presentCredentials({
			challenge: originalChallenge,
			delegation: delegation.raw,
			agent,
		});

		// Service verifies with a different challenge (replay attack scenario)
		const differentChallenge = createChallenge({
			from: "did:web:service.example.com",
		});
		const result = await verifyPresentation(presentation, {
			challenge: differentChallenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.HANDSHAKE_INVALID_NONCE),
		).toBe(true);
	});
});
