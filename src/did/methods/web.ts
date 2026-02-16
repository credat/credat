import type { DIDDocument, DIDResolutionResult } from "../../types";

export function didWebToUrl(did: string): string {
	const parts = did.replace("did:web:", "").split(":");
	const domain = decodeURIComponent(parts[0]!);

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

export async function resolveDidWeb(did: string): Promise<DIDResolutionResult> {
	try {
		const url = didWebToUrl(did);
		const response = await fetch(url);

		if (!response.ok) {
			return {
				didDocument: null,
				didResolutionMetadata: { error: "notFound" },
				didDocumentMetadata: {},
			};
		}

		const didDocument = (await response.json()) as DIDDocument;
		return {
			didDocument,
			didResolutionMetadata: {},
			didDocumentMetadata: {},
		};
	} catch {
		return {
			didDocument: null,
			didResolutionMetadata: { error: "notFound" },
			didDocumentMetadata: {},
		};
	}
}
