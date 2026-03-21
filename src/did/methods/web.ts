import { DIDError, ErrorCodes } from "../../errors";
import type { DIDDocument, DIDResolutionResult } from "../../types";
import type { DIDCache } from "../cache";

export function didWebToUrl(did: string): string {
	const parts = did.replace("did:web:", "").split(":");
	const domain = decodeURIComponent(parts[0] ?? "");

	if (parts.length === 1) {
		return `https://${domain}/.well-known/did.json`;
	}

	const path = parts.slice(1).join("/");
	return `https://${domain}/${path}/did.json`;
}

export function createDidWeb(domain: string, path?: string): string {
	if (path) {
		const encodedPath = path.replace(/\//g, ":");
		return `did:web:${domain}:${encodedPath}`;
	}
	return `did:web:${domain}`;
}

function isValidDIDDocument(doc: unknown): doc is DIDDocument {
	if (!doc || typeof doc !== "object") return false;
	const obj = doc as Record<string, unknown>;
	return typeof obj.id === "string" && obj.id.startsWith("did:");
}

export interface ResolveDidWebOptions {
	timeout?: number;
	cache?: DIDCache;
}

export async function resolveDidWeb(
	did: string,
	options?: ResolveDidWebOptions,
): Promise<DIDResolutionResult> {
	// Check cache first
	if (options?.cache) {
		const cached = options.cache.get(did);
		if (cached) return cached;
	}

	const timeout = options?.timeout ?? 10_000;
	const url = didWebToUrl(did);
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);

		if (!response.ok) {
			const error = response.status === 404 ? "notFound" : "networkError";
			return {
				didDocument: null,
				didResolutionMetadata: { error },
				didDocumentMetadata: {},
			};
		}

		const body: unknown = await response.json();

		if (!isValidDIDDocument(body)) {
			return {
				didDocument: null,
				didResolutionMetadata: { error: "invalidDidDocument" },
				didDocumentMetadata: {},
			};
		}

		const result: DIDResolutionResult = {
			didDocument: body,
			didResolutionMetadata: {},
			didDocumentMetadata: {},
		};

		// Cache successful resolutions
		if (options?.cache) {
			options.cache.set(did, result);
		}

		return result;
	} catch (error) {
		clearTimeout(timeoutId);

		if (controller.signal.aborted) {
			throw new DIDError(
				ErrorCodes.DID_RESOLUTION_FAILED,
				`DID resolution timed out after ${timeout}ms for ${did} (URL: ${url})`,
			);
		}

		const detail = error instanceof Error ? `: ${error.message}` : "";
		return {
			didDocument: null,
			didResolutionMetadata: { error: `networkError${detail}` },
			didDocumentMetadata: {},
		};
	}
}
