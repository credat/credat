import type { DIDResolutionResult } from "../types";

export interface DIDCacheOptions {
	/** Time-to-live in milliseconds. Default: 300_000 (5 minutes). */
	ttlMs?: number;
	/** Maximum cached entries. Oldest evicted when full. Default: 100. */
	maxEntries?: number;
}

interface CacheEntry {
	result: DIDResolutionResult;
	expiresAt: number;
}

export class DIDCache {
	private cache = new Map<string, CacheEntry>();
	readonly ttlMs: number;
	readonly maxEntries: number;

	constructor(options?: DIDCacheOptions) {
		this.ttlMs = options?.ttlMs ?? 300_000;
		this.maxEntries = options?.maxEntries ?? 100;
	}

	get(did: string): DIDResolutionResult | undefined {
		const entry = this.cache.get(did);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(did);
			return undefined;
		}
		return entry.result;
	}

	set(did: string, result: DIDResolutionResult): void {
		// Only cache successful resolutions
		if (!result.didDocument) return;

		// Evict oldest entry if at capacity
		if (this.cache.size >= this.maxEntries && !this.cache.has(did)) {
			const oldest = this.cache.keys().next().value;
			if (oldest) this.cache.delete(oldest);
		}

		this.cache.set(did, {
			result,
			expiresAt: Date.now() + this.ttlMs,
		});
	}

	delete(did: string): boolean {
		return this.cache.delete(did);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}
