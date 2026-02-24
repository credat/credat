import { describe, it, expect } from "vitest";
import { createAgent } from "./create";
import { MemoryStorage } from "../storage/memory";

describe("createAgent", () => {
	it("creates agent with did:web from domain", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		expect(agent.did).toBe("did:web:agent.example.com");
		expect(agent.didDocument).toBeDefined();
		expect(agent.didDocument.id).toBe("did:web:agent.example.com");
		expect(agent.keyPair.publicKey).toBeInstanceOf(Uint8Array);
		expect(agent.keyPair.privateKey).toBeInstanceOf(Uint8Array);
		expect(agent.algorithm).toBe("ES256");
	});

	it("creates agent with path", async () => {
		const agent = await createAgent({
			domain: "example.com",
			path: "agents/booking",
		});
		expect(agent.did).toBe("did:web:example.com:agents:booking");
		expect(agent.didDocument.id).toBe("did:web:example.com:agents:booking");
	});

	it("creates agent with EdDSA algorithm", async () => {
		const agent = await createAgent({
			domain: "agent.example.com",
			algorithm: "EdDSA",
		});
		expect(agent.algorithm).toBe("EdDSA");
		expect(agent.keyPair.algorithm).toBe("EdDSA");
	});

	it("creates agent with ES256K algorithm", async () => {
		const agent = await createAgent({
			domain: "agent.example.com",
			algorithm: "ES256K",
		});
		expect(agent.algorithm).toBe("ES256K");
	});

	it("persists agent to storage when provided", async () => {
		const storage = new MemoryStorage();
		const agent = await createAgent({
			domain: "agent.example.com",
			storage,
		});
		const stored = await storage.get("agents", agent.did);
		expect(stored).toBeDefined();
	});

	it("generates valid DID document with verification methods", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		const doc = agent.didDocument;
		expect(doc.verificationMethod).toHaveLength(1);
		expect(doc.verificationMethod![0].type).toBe("JsonWebKey2020");
		expect(doc.verificationMethod![0].publicKeyJwk).toBeDefined();
		expect(doc.authentication).toHaveLength(1);
		expect(doc.assertionMethod).toHaveLength(1);
	});

	it("throws on empty domain", async () => {
		await expect(createAgent({ domain: "" })).rejects.toThrow();
	});
});
