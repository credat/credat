import { describe, expect, it } from "vitest";
import {
	createStatusList,
	isRevoked,
	setRevocationStatus,
} from "../credentials/formats/status-list";
import { MemoryStorage } from "./memory";
import {
	deleteStatusList,
	listStatusLists,
	loadStatusList,
	saveStatusList,
} from "./status-list";

describe("Status List Storage", () => {
	it("saves and loads a status list", async () => {
		const storage = new MemoryStorage();
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});

		await saveStatusList(storage, list);
		const loaded = await loadStatusList(storage, "list-1");

		expect(loaded).not.toBeNull();
		expect(loaded?.id).toBe("list-1");
		expect(loaded?.issuer).toBe("did:key:z123");
		expect(loaded?.size).toBe(131_072);
		expect(loaded?.bitstring).toBeInstanceOf(Uint8Array);
		expect(loaded?.bitstring.length).toBe(131_072 / 8);
	});

	it("preserves revocation status across save/load", async () => {
		const storage = new MemoryStorage();
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});

		setRevocationStatus(list, 42, true);
		setRevocationStatus(list, 100, true);

		await saveStatusList(storage, list);
		const loaded = await loadStatusList(storage, "list-1");

		if (!loaded) throw new Error("Expected loaded to be non-null");
		expect(isRevoked(loaded, 42)).toBe(true);
		expect(isRevoked(loaded, 100)).toBe(true);
		expect(isRevoked(loaded, 0)).toBe(false);
		expect(isRevoked(loaded, 43)).toBe(false);
	});

	it("returns null for non-existent status list", async () => {
		const storage = new MemoryStorage();
		const loaded = await loadStatusList(storage, "nonexistent");
		expect(loaded).toBeNull();
	});

	it("updates an existing status list", async () => {
		const storage = new MemoryStorage();
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});

		await saveStatusList(storage, list);

		// Update: revoke an entry
		setRevocationStatus(list, 42, true);
		await saveStatusList(storage, list);

		const loaded = await loadStatusList(storage, "list-1");
		if (!loaded) throw new Error("Expected loaded to be non-null");
		expect(isRevoked(loaded, 42)).toBe(true);
	});

	it("deletes a status list", async () => {
		const storage = new MemoryStorage();
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});

		await saveStatusList(storage, list);
		const deleted = await deleteStatusList(storage, "list-1");
		expect(deleted).toBe(true);

		const loaded = await loadStatusList(storage, "list-1");
		expect(loaded).toBeNull();
	});

	it("returns false when deleting non-existent status list", async () => {
		const storage = new MemoryStorage();
		const deleted = await deleteStatusList(storage, "nonexistent");
		expect(deleted).toBe(false);
	});

	it("lists all status lists", async () => {
		const storage = new MemoryStorage();

		const list1 = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		const list2 = createStatusList({
			id: "list-2",
			issuer: "did:key:z456",
			url: "https://example.com/status/2",
		});

		await saveStatusList(storage, list1);
		await saveStatusList(storage, list2);

		const lists = await listStatusLists(storage);
		expect(lists).toHaveLength(2);
		expect(lists.map((l) => l.id).sort()).toEqual(["list-1", "list-2"]);
		expect(lists[0]?.bitstring).toBeInstanceOf(Uint8Array);
	});

	it("lists empty when no status lists saved", async () => {
		const storage = new MemoryStorage();
		const lists = await listStatusLists(storage);
		expect(lists).toEqual([]);
	});
});
