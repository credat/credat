import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import {
	base64urlToUint8Array,
	uint8ArrayToBase64url,
} from "../../crypto/keys";
import { sign, verifySignature } from "../../crypto/sign";
import type { CredentialClaims } from "../../types";
import { base64urlToJson, jsonToBase64url } from "../utils";

export interface SdJwtVcCreateOptions {
	issuerPrivateKey: Uint8Array;
	issuerPublicKey: Uint8Array;
	issuerDid: string;
	type: string;
	claims: CredentialClaims;
	selectiveDisclosure: string[];
	holderDid?: string;
	expiresAt?: Date;
	statusListUrl?: string;
	statusListIndex?: number;
}

export interface SdJwtVcVerifyResult {
	valid: boolean;
	claims: CredentialClaims;
	issuer: string;
	format: "sd-jwt-vc";
	issuedAt: Date;
	expiresAt?: Date;
	errors?: string[];
	statusListEntry?: { statusListUrl: string; statusListIndex: number };
}

interface Disclosure {
	salt: string;
	claimName: string;
	claimValue: unknown;
	encoded: string;
	digest: string;
}

// === CREATE ===

export async function createSdJwtVc(
	options: SdJwtVcCreateOptions,
): Promise<string> {
	const { issuerPrivateKey, issuerDid, type, claims, selectiveDisclosure } =
		options;

	// Create disclosures for SD claims
	const disclosures: Disclosure[] = [];
	const sdDigests: string[] = [];
	const plainClaims: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(claims)) {
		if (selectiveDisclosure.includes(key)) {
			const disclosure = createDisclosure(key, value);
			disclosures.push(disclosure);
			sdDigests.push(disclosure.digest);
		} else {
			plainClaims[key] = value;
		}
	}

	// Build JWT payload
	const now = Math.floor(Date.now() / 1000);
	const payload: Record<string, unknown> = {
		iss: issuerDid,
		iat: now,
		vct: type, // Verifiable Credential Type (SD-JWT VC spec)
		...plainClaims,
	};

	if (sdDigests.length > 0) {
		payload._sd = sdDigests;
		payload._sd_alg = "sha-256";
	}

	if (options.holderDid) {
		payload.sub = options.holderDid;
	}

	if (options.expiresAt) {
		payload.exp = Math.floor(options.expiresAt.getTime() / 1000);
	}

	if (options.statusListUrl != null && options.statusListIndex != null) {
		payload.status = {
			status_list: {
				idx: options.statusListIndex,
				uri: options.statusListUrl,
			},
		};
	}

	// Build JWT header (draft-14: typ = dc+sd-jwt)
	const header = {
		alg: "ES256",
		typ: "dc+sd-jwt",
		kid: `${issuerDid}#key-1`,
	};

	// Encode and sign JWT
	const headerB64 = jsonToBase64url(header);
	const payloadB64 = jsonToBase64url(payload);
	const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
	const signature = sign(signingInput, issuerPrivateKey, "ES256");
	const signatureB64 = uint8ArrayToBase64url(signature);

	const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

	// Combine: <jwt>~<disclosure1>~<disclosure2>~...~ (trailing tilde mandatory per spec)
	const disclosureParts = disclosures.map((d) => d.encoded);
	return [jwt, ...disclosureParts, ""].join("~");
}

// === VERIFY ===

export async function verifySdJwtVc(
	sdJwt: string,
	issuerPublicKey: Uint8Array,
): Promise<SdJwtVcVerifyResult> {
	try {
		const parts = sdJwt.split("~");
		const jwt = parts[0]!;
		const disclosureStrings = parts.slice(1).filter((d) => d.length > 0);

		// Parse JWT
		const jwtParts = jwt.split(".");
		if (jwtParts.length !== 3) {
			return {
				valid: false,
				claims: {},
				issuer: "",
				format: "sd-jwt-vc",
				issuedAt: new Date(),
				errors: ["Invalid JWT format"],
			};
		}

		const payload = base64urlToJson(jwtParts[1]!);
		const signatureBytes = base64urlToUint8Array(jwtParts[2]!);

		// Verify signature
		const signingInput = new TextEncoder().encode(
			`${jwtParts[0]}.${jwtParts[1]}`,
		);
		const signatureValid = verifySignature(
			signingInput,
			signatureBytes,
			issuerPublicKey,
			"ES256",
		);

		if (!signatureValid) {
			return {
				valid: false,
				claims: {},
				issuer: "",
				format: "sd-jwt-vc",
				issuedAt: new Date(),
				errors: ["Invalid signature"],
			};
		}

		// Process disclosures
		const claims: CredentialClaims = {};
		const sdDigests = (payload._sd as string[]) ?? [];

		// Add plain claims (everything except reserved fields)
		const reserved = new Set([
			"iss",
			"iat",
			"exp",
			"vct",
			"sub",
			"_sd",
			"_sd_alg",
			"cnf",
			"status",
		]);
		for (const [key, value] of Object.entries(payload)) {
			if (!reserved.has(key)) {
				claims[key] = value as string | number | boolean;
			}
		}

		// Process each disclosure
		for (const disclosureStr of disclosureStrings) {
			const disclosureJson = JSON.parse(
				new TextDecoder().decode(base64urlToUint8Array(disclosureStr)),
			) as [string, string, unknown];
			const [, claimName, claimValue] = disclosureJson;

			// Verify disclosure digest is in _sd array
			const digest = computeDisclosureDigest(disclosureStr);
			if (sdDigests.includes(digest)) {
				claims[claimName] = claimValue as string | number | boolean;
			}
		}

		// Extract status list entry if present
		const statusPayload = payload.status as
			| { status_list?: { idx?: number; uri?: string } }
			| undefined;
		const statusListEntry =
			statusPayload?.status_list?.uri != null &&
			statusPayload?.status_list?.idx != null
				? {
						statusListUrl: statusPayload.status_list.uri,
						statusListIndex: statusPayload.status_list.idx,
					}
				: undefined;

		return {
			valid: true,
			claims,
			issuer: payload.iss as string,
			format: "sd-jwt-vc",
			issuedAt: new Date((payload.iat as number) * 1000),
			expiresAt: payload.exp
				? new Date((payload.exp as number) * 1000)
				: undefined,
			statusListEntry,
		};
	} catch (error) {
		return {
			valid: false,
			claims: {},
			issuer: "",
			format: "sd-jwt-vc",
			issuedAt: new Date(),
			errors: [(error as Error).message],
		};
	}
}

// === PRESENT (Selective Disclosure) ===

export function presentSdJwtVc(sdJwt: string, revealClaims: string[]): string {
	const parts = sdJwt.split("~");
	const jwt = parts[0]!;
	const disclosureStrings = parts.slice(1).filter((d) => d.length > 0);

	// Filter disclosures to only include those for requested claims
	const includedDisclosures: string[] = [];

	for (const disclosureStr of disclosureStrings) {
		const disclosureJson = JSON.parse(
			new TextDecoder().decode(base64urlToUint8Array(disclosureStr)),
		) as [string, string, unknown];
		const claimName = disclosureJson[1];

		if (revealClaims.includes(claimName)) {
			includedDisclosures.push(disclosureStr);
		}
	}

	// Trailing tilde mandatory per spec
	return [jwt, ...includedDisclosures, ""].join("~");
}

// === Helpers ===

function createDisclosure(claimName: string, claimValue: unknown): Disclosure {
	// 128-bit salt per EBSI profile
	const salt = uint8ArrayToBase64url(randomBytes(16));
	const disclosureArray = [salt, claimName, claimValue];
	const encoded = jsonToBase64url(disclosureArray);
	const digest = computeDisclosureDigest(encoded);

	return { salt, claimName, claimValue, encoded, digest };
}

function computeDisclosureDigest(encoded: string): string {
	const bytes = new TextEncoder().encode(encoded);
	const hash = sha256(bytes);
	return uint8ArrayToBase64url(hash);
}
