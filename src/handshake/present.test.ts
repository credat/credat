import { describe, it, expect } from "vitest";
import { createChallenge } from "./challenge";
import { presentCredentials } from "./present";
import { delegate } from "../delegation/issue";
import { createAgent } from "../agent/create";
import { generateKeyPair } from "../crypto/keys";
import { createDidWeb } from "../did/methods/web";

describe("presentCredentials", () => {
	it("creates a presentation from challenge + delegation", async () => {
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

		const presentation = await presentCredentials({
			challenge,
			delegation: delegation.raw,
			agent,
		});

		expect(presentation.type).toBe("credat:presentation");
		expect(presentation.nonce).toBe(challenge.nonce);
		expect(presentation.delegation).toBe(delegation.raw);
		expect(presentation.proof).toBeDefined();
		expect(presentation.from).toBe(agent.did);
	});
});
