import { decode, encode } from "cbor-x";
import { sign, verifySignature } from "../../crypto/sign";
import type { CredentialClaims } from "../../types";

export interface MdocCreateOptions {
	issuerPrivateKey: Uint8Array;
	issuerPublicKey: Uint8Array;
	issuerDid: string;
	docType: string;
	nameSpace: string;
	claims: CredentialClaims;
	expiresAt?: Date;
	statusListUrl?: string;
	statusListIndex?: number;
}

export interface MdocVerifyResult {
	valid: boolean;
	claims: CredentialClaims;
	issuer: string;
	docType: string;
	format: "mdoc";
	issuedAt: Date;
	expiresAt?: Date;
	errors?: string[];
	statusListEntry?: { statusListUrl: string; statusListIndex: number };
}

// Simplified COSE_Sign1 structure: [protected, unprotected, payload, signature]
// COSE alg identifier: ES256 = -7

export async function createMdoc(
	options: MdocCreateOptions,
): Promise<Uint8Array> {
	const { issuerPrivateKey, issuerDid, docType, nameSpace, claims } = options;

	// Build issuer-signed data
	const now = new Date();
	const issuerSignedData: Record<string, unknown> = {
		docType,
		nameSpace,
		claims,
		issuer: issuerDid,
		issuedAt: now.toISOString(),
		expiresAt: options.expiresAt?.toISOString(),
	};

	if (options.statusListUrl != null && options.statusListIndex != null) {
		issuerSignedData.statusListUrl = options.statusListUrl;
		issuerSignedData.statusListIndex = options.statusListIndex;
	}

	// COSE protected header: { 1: -7 } (1 = alg, -7 = ES256)
	const protectedHeader = encode({ 1: -7 });

	// Payload as CBOR
	const payload = encode(issuerSignedData);

	// Create COSE Sig_structure: ["Signature1", protectedHeader, externalAad, payload]
	const sigStructure = encode([
		"Signature1",
		protectedHeader,
		new Uint8Array(0),
		payload,
	]);

	// Sign the Sig_structure directly — p256.sign() hashes with SHA-256 internally
	// (no manual pre-hashing needed, that would cause double-hashing)
	const signature = sign(sigStructure, issuerPrivateKey, "ES256");

	// COSE_Sign1: [protectedHeader, {}, payload, signature]
	return encode([protectedHeader, {}, payload, signature]);
}

export async function verifyMdoc(
	mdocBytes: Uint8Array,
	issuerPublicKey: Uint8Array,
): Promise<MdocVerifyResult> {
	try {
		// Normalize input — cbor-x decodes internal byte strings differently
		// for Buffer vs Uint8Array inputs, which breaks signature verification
		const normalizedInput = Buffer.isBuffer(mdocBytes)
			? mdocBytes
			: Buffer.from(mdocBytes);
		const decoded = decode(normalizedInput) as [
			Uint8Array,
			Record<string, unknown>,
			Uint8Array,
			Uint8Array,
		];
		const [protectedHeader, , payload, signature] = decoded;

		// Decode payload
		const issuerSignedData = decode(payload) as {
			docType: string;
			nameSpace: string;
			claims: CredentialClaims;
			issuer: string;
			issuedAt: string;
			expiresAt?: string;
			statusListUrl?: string;
			statusListIndex?: number;
		};

		// Reconstruct Sig_structure for verification
		const sigStructure = encode([
			"Signature1",
			protectedHeader,
			new Uint8Array(0),
			payload,
		]);

		// Verify signature (p256.verify hashes internally, matching p256.sign behavior)
		const valid = verifySignature(
			sigStructure,
			signature,
			issuerPublicKey,
			"ES256",
		);

		if (!valid) {
			return {
				valid: false,
				claims: {},
				issuer: "",
				docType: "",
				format: "mdoc",
				issuedAt: new Date(),
				errors: ["Invalid signature"],
			};
		}

		const statusListEntry =
			issuerSignedData.statusListUrl != null &&
			issuerSignedData.statusListIndex != null
				? {
						statusListUrl: issuerSignedData.statusListUrl,
						statusListIndex: issuerSignedData.statusListIndex,
					}
				: undefined;

		return {
			valid: true,
			claims: issuerSignedData.claims,
			issuer: issuerSignedData.issuer,
			docType: issuerSignedData.docType,
			format: "mdoc",
			issuedAt: new Date(issuerSignedData.issuedAt),
			expiresAt: issuerSignedData.expiresAt
				? new Date(issuerSignedData.expiresAt)
				: undefined,
			statusListEntry,
		};
	} catch (error) {
		return {
			valid: false,
			claims: {},
			issuer: "",
			docType: "",
			format: "mdoc",
			issuedAt: new Date(),
			errors: [(error as Error).message],
		};
	}
}
