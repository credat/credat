import Database from "better-sqlite3";
import type { StorageAdapter } from "./types";

export class SqliteStorage implements StorageAdapter {
	private db: Database.Database;

	constructor(path: string = ":memory:") {
		this.db = new Database(path);
		this.db.pragma("journal_mode = WAL");
		this.db.exec(
			"CREATE TABLE IF NOT EXISTS store (collection TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (collection, key))",
		);
	}

	async get<T>(collection: string, key: string): Promise<T | null> {
		const row = this.db
			.prepare("SELECT value FROM store WHERE collection = ? AND key = ?")
			.get(collection, key) as { value: string } | undefined;

		if (!row) return null;
		return JSON.parse(row.value) as T;
	}

	async set<T>(collection: string, key: string, value: T): Promise<void> {
		const json = JSON.stringify(value);
		this.db
			.prepare(
				"INSERT INTO store (collection, key, value) VALUES (?, ?, ?) ON CONFLICT(collection, key) DO UPDATE SET value = excluded.value",
			)
			.run(collection, key, json);
	}

	async delete(collection: string, key: string): Promise<boolean> {
		const result = this.db
			.prepare("DELETE FROM store WHERE collection = ? AND key = ?")
			.run(collection, key);
		return result.changes > 0;
	}

	async list<T>(collection: string): Promise<Array<{ key: string; value: T }>> {
		const rows = this.db
			.prepare("SELECT key, value FROM store WHERE collection = ?")
			.all(collection) as Array<{ key: string; value: string }>;

		return rows.map((row) => ({
			key: row.key,
			value: JSON.parse(row.value) as T,
		}));
	}

	async clear(collection?: string): Promise<void> {
		if (collection) {
			this.db.prepare("DELETE FROM store WHERE collection = ?").run(collection);
		} else {
			this.db.prepare("DELETE FROM store").run();
		}
	}

	close(): void {
		this.db.close();
	}
}
