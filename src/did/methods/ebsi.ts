import type { DIDDocument, DIDResolutionResult } from "../../types";

const EBSI_DID_REGISTRY =
	"https://api-pilot.ebsi.eu/did-registry/v5/identifiers";

export async function resolveDidEbsi(
	did: string,
): Promise<DIDResolutionResult> {
	try {
		const url = `${EBSI_DID_REGISTRY}/${encodeURIComponent(did)}`;
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
