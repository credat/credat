import { describe, expect, it } from "vitest";
import { createAgent } from "../agent/create";
import { generateKeyPair } from "../crypto/keys";
import { delegate } from "../delegation/issue";
import { createDidWeb } from "../did/methods/web";
import { ErrorCodes } from "../errors";
import { createChallenge } from "./challenge";
import { presentCredentials } from "./present";
import { verifyPresentation } from "./verify";

describe("verifyPresentation", () => {
	it("verifies a valid presentation", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel", "read:email"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(true);
		expect(result.agent).toBe(agent.did);
		expect(result.owner).toBe(ownerDid);
		expect(result.scopes).toContain("book:travel");
	});

	it("rejects presentation with wrong nonce", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });
		const wrongChallenge = createChallenge({
			from: "did:web:service.example.com",
		});

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge: wrongChallenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.HANDSHAKE_INVALID_NONCE),
		).toBe(true);
	});

	it("rejects presentation with wrong agent key", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const fakeAgent = await createAgent({ domain: "fake.example.com" });
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: fakeAgent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
	});

	it("rejects expired challenge (older than 5 minutes)", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });
		// Backdate challenge by 6 minutes
		challenge.timestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString();

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.HANDSHAKE_EXPIRED),
		).toBe(true);
	});

	it("rejects presenter DID mismatch with delegation agent", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const impersonator = await createAgent({
			domain: "impersonator.example.com",
		});
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		// Delegation is for agent, but impersonator will present it
		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });

		// Impersonator signs the nonce and presents agent's delegation
		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent: impersonator,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: impersonator.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(e) => e.code === ErrorCodes.HANDSHAKE_VERIFICATION_FAILED,
			),
		).toBe(true);
	});

	// === Issue #8: Invalid timestamp tests ===

	it("rejects challenge with garbage timestamp", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });
		challenge.timestamp = "not-a-date";

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.HANDSHAKE_EXPIRED),
		).toBe(true);
		expect(result.errors.some((e) => e.message.includes("unparseable"))).toBe(
			true,
		);
	});

	it("rejects challenge with empty timestamp", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });
		challenge.timestamp = "";

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === ErrorCodes.HANDSHAKE_EXPIRED),
		).toBe(true);
	});

	it("accepts challenge with valid ISO timestamp", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const ownerKeyPair = generateKeyPair("ES256");
		const ownerDid = createDidWeb("owner.example.com");

		const delegation = await delegate({
			agent: agent.did,
			owner: ownerDid,
			ownerKeyPair,
			scopes: ["book:travel"],
		});

		const challenge = createChallenge({ from: "did:web:service.example.com" });
		// Valid timestamp, just set explicitly
		challenge.timestamp = new Date().toISOString();

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.token,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(true);
	});
});
