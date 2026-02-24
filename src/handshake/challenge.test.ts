import { describe, it, expect } from "vitest";
import { createChallenge } from "./challenge";

describe("createChallenge", () => {
	it("creates a challenge message", () => {
		const challenge = createChallenge({ from: "did:web:service.example.com" });
		expect(challenge.type).toBe("credat:challenge");
		expect(challenge.from).toBe("did:web:service.example.com");
		expect(challenge.nonce).toBeDefined();
		expect(challenge.nonce.length).toBeGreaterThan(10);
		expect(challenge.timestamp).toBeDefined();
	});

	it("generates unique nonces", () => {
		const c1 = createChallenge({ from: "did:web:a.com" });
		const c2 = createChallenge({ from: "did:web:a.com" });
		expect(c1.nonce).not.toBe(c2.nonce);
	});
});
