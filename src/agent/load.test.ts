import { describe, it, expect } from "vitest";
import { createAgent } from "./create";
import { loadAgent } from "./load";
import { MemoryStorage } from "../storage/memory";

describe("loadAgent", () => {
	it("loads a previously created agent", async () => {
		const storage = new MemoryStorage();
		const original = await createAgent({
			domain: "agent.example.com",
			storage,
		});

		const loaded = await loadAgent({
			did: original.did,
			storage,
		});

		expect(loaded.did).toBe(original.did);
		expect(loaded.algorithm).toBe(original.algorithm);
		expect(loaded.keyPair.publicKey).toEqual(original.keyPair.publicKey);
		expect(loaded.keyPair.privateKey).toEqual(original.keyPair.privateKey);
		expect(loaded.didDocument.id).toBe(original.did);
	});

	it("throws when agent not found in storage", async () => {
		const storage = new MemoryStorage();
		await expect(
			loadAgent({ did: "did:web:nonexistent.com", storage }),
		).rejects.toThrow();
	});
});
