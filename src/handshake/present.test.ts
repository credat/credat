import { describe, expect, it } from "vitest";
import { createAgent } from "../agent/create";
import { generateKeyPair } from "../crypto/keys";
import { delegate } from "../delegation/issue";
import { createDidWeb } from "../did/methods/web";
import { createChallenge } from "./challenge";
import { presentCredentials } from "./present";

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
			delegation: delegation.token,
			agent,
		});

		expect(presentation.type).toBe("credat:presentation");
		expect(presentation.nonce).toBe(challenge.nonce);
		expect(presentation.delegation).toBe(delegation.token);
		expect(presentation.proof).toBeDefined();
		expect(presentation.from).toBe(agent.did);
	});
});
