import type { DIDDocument, DIDResolutionResult } from "../../types";

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

export async function resolveDidWeb(did: string): Promise<DIDResolutionResult> {
	try {
		const url = didWebToUrl(did);
		const response = await fetch(url);

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

		return {
			didDocument: body,
			didResolutionMetadata: {},
			didDocumentMetadata: {},
		};
	} catch (error) {
		const detail = error instanceof Error ? `: ${error.message}` : "";
		return {
			didDocument: null,
			didResolutionMetadata: { error: `networkError${detail}` },
			didDocumentMetadata: {},
		};
	}
}
