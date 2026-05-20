import { describe, expect, it } from "vitest";
import { AgentError, ErrorCodes } from "../errors";
import { MemoryStorage } from "../storage/memory";
import type { StorageAdapter } from "../types";
import { createAgent } from "./create";

describe("createAgent", () => {
	it("creates agent with did:web from domain", async () => {
		const agent = await createAgent({ domain: "agent.example.com" });
		expect(agent.did).toBe("did:web:agent.example.com");
		expect(agent.didDocument).toBeDefined();
		expect(agent.didDocument.id).toBe("did:web:agent.example.com");
		expect(agent.keyPair.publicKey).toBeInstanceOf(Uint8Array);
		expect(agent.keyPair.privateKey).toBeInstanceOf(Uint8Array);
		expect(agent.keyPair.algorithm).toBe("ES256");
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
		expect(agent.keyPair.algorithm).toBe("EdDSA");
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
		expect(doc.verificationMethod?.[0].type).toBe("JsonWebKey2020");
		expect(doc.verificationMethod?.[0].publicKeyJwk).toBeDefined();
		expect(doc.authentication).toHaveLength(1);
		expect(doc.assertionMethod).toHaveLength(1);
	});

	it("throws on empty domain", async () => {
		await expect(createAgent({ domain: "" })).rejects.toThrow();
	});

	it("throws AgentError when storage fails", async () => {
		const failingStorage: StorageAdapter = {
			get: async () => null,
			set: async () => {
				throw new Error("disk full");
			},
			delete: async () => {},
			list: async () => [],
		};

		await expect(
			createAgent({ domain: "agent.example.com", storage: failingStorage }),
		).rejects.toThrow(AgentError);

		try {
			await createAgent({
				domain: "agent.example.com",
				storage: failingStorage,
			});
		} catch (err) {
			expect(err).toBeInstanceOf(AgentError);
			expect((err as AgentError).code).toBe(ErrorCodes.AGENT_CREATION_FAILED);
			expect((err as AgentError).message).toContain("failed to persist");
			expect((err as AgentError).message).toContain("disk full");
		}
	});
});
