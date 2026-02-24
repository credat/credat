import { existsSync, mkdtempSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteStorage } from "./sqlite";

describe("SqliteStorage", () => {
	let storage: SqliteStorage;

	beforeEach(() => {
		storage = new SqliteStorage(); // in-memory
	});

	afterEach(() => {
		storage.close();
	});

	it("stores and retrieves a value", async () => {
		await storage.set("creds", "id-1", { type: "KYC", name: "Alice" });
		const result = await storage.get("creds", "id-1");
		expect(result).toEqual({ type: "KYC", name: "Alice" });
	});

	it("returns null for missing key", async () => {
		const result = await storage.get("creds", "nonexistent");
		expect(result).toBeNull();
	});

	it("deletes a value", async () => {
		await storage.set("creds", "id-1", { name: "Alice" });
		const deleted = await storage.delete("creds", "id-1");
		expect(deleted).toBe(true);
		expect(await storage.get("creds", "id-1")).toBeNull();
	});

	it("returns false when deleting nonexistent key", async () => {
		const deleted = await storage.delete("creds", "nonexistent");
		expect(deleted).toBe(false);
	});

	it("lists all items in a collection", async () => {
		await storage.set("creds", "id-1", { name: "Alice" });
		await storage.set("creds", "id-2", { name: "Bob" });
		const items = await storage.list("creds");
		expect(items).toHaveLength(2);
	});

	it("isolates collections", async () => {
		await storage.set("creds", "id-1", { name: "Alice" });
		await storage.set("keys", "key-1", { algo: "ES256" });
		expect(await storage.list("creds")).toHaveLength(1);
		expect(await storage.list("keys")).toHaveLength(1);
	});

	it("clears a specific collection", async () => {
		await storage.set("creds", "id-1", { name: "Alice" });
		await storage.set("keys", "key-1", { algo: "ES256" });
		await storage.clear("creds");
		expect(await storage.list("creds")).toHaveLength(0);
		expect(await storage.list("keys")).toHaveLength(1);
	});

	it("clears all collections", async () => {
		await storage.set("creds", "id-1", { name: "Alice" });
		await storage.set("keys", "key-1", { algo: "ES256" });
		await storage.clear();
		expect(await storage.list("creds")).toHaveLength(0);
		expect(await storage.list("keys")).toHaveLength(0);
	});

	// SQLite-specific tests

	it("persists data across re-open", async () => {
		const dir = mkdtempSync(join(tmpdir(), "credat-sqlite-"));
		const dbPath = join(dir, "test.db");

		const storage1 = new SqliteStorage(dbPath);
		await storage1.set("creds", "id-1", { name: "Alice" });
		storage1.close();

		const storage2 = new SqliteStorage(dbPath);
		const result = await storage2.get("creds", "id-1");
		expect(result).toEqual({ name: "Alice" });
		storage2.close();

		// Cleanup
		if (existsSync(dbPath)) unlinkSync(dbPath);
		if (existsSync(`${dbPath}-wal`)) unlinkSync(`${dbPath}-wal`);
		if (existsSync(`${dbPath}-shm`)) unlinkSync(`${dbPath}-shm`);
	});

	it("round-trips complex JSON values", async () => {
		const complex = {
			name: "Alice",
			age: 30,
			active: true,
			address: { city: "Paris", zip: "75001" },
			tags: ["admin", "user"],
			metadata: null,
		};

		await storage.set("creds", "complex", complex);
		const result = await storage.get("creds", "complex");
		expect(result).toEqual(complex);
	});
});
