import { describe, it, expect } from "vitest";
import { createChallenge } from "./challenge";
import { presentCredentials } from "./present";
import { verifyPresentation } from "./verify";
import { delegate } from "../delegation/issue";
import { createAgent } from "../agent/create";
import { generateKeyPair } from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";

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
			delegation: delegation.raw,
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
			delegation: delegation.raw,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge: wrongChallenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: agent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === "HANDSHAKE_INVALID_NONCE"),
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
			delegation: delegation.raw,
			agent,
		});

		const result = await verifyPresentation(presentation, {
			challenge,
			ownerPublicKey: ownerKeyPair.publicKey,
			agentPublicKey: fakeAgent.keyPair.publicKey,
		});

		expect(result.valid).toBe(false);
	});
});
