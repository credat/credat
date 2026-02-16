import type { Algorithm } from "../../crypto/keys";
import { publicKeyToJwk } from "../../crypto/keys";
import type { DIDDocument, DIDResolutionResult } from "../../types";

// Multicodec varint prefixes (spec-compliant)
// P-256 (p256-pub): 0x1200 → varint [0x80, 0x24]
// Ed25519 (ed25519-pub): 0xed → varint [0xed, 0x01]
const MULTICODEC_P256 = new Uint8Array([0x80, 0x24]);
const MULTICODEC_ED25519 = new Uint8Array([0xed, 0x01]);

export function createDidKey(
	publicKey: Uint8Array,
	algorithm: Algorithm,
): string {
	const prefix = algorithm === "ES256" ? MULTICODEC_P256 : MULTICODEC_ED25519;
	const multicodecKey = new Uint8Array(prefix.length + publicKey.length);
	multicodecKey.set(prefix, 0);
	multicodecKey.set(publicKey, prefix.length);

	// Multibase base58btc encoding (prefix 'z')
	const encoded = base58btcEncode(multicodecKey);
	return `did:key:z${encoded}`;
}

export function resolveDidKey(did: string): DIDResolutionResult {
	try {
		if (!did.startsWith("did:key:z")) {
			return {
				didDocument: null,
				didResolutionMetadata: { error: "invalidDid" },
				didDocumentMetadata: {},
			};
		}

		const multibaseEncoded = did.slice("did:key:z".length);
		const multicodecKey = base58btcDecode(multibaseEncoded);

		let algorithm: Algorithm;
		let publicKey: Uint8Array;

		// Check multicodec prefix
		if (multicodecKey[0] === 0x80 && multicodecKey[1] === 0x24) {
			algorithm = "ES256";
			publicKey = multicodecKey.slice(2);
		} else if (multicodecKey[0] === 0xed && multicodecKey[1] === 0x01) {
			algorithm = "EdDSA";
			publicKey = multicodecKey.slice(2);
		} else {
			return {
				didDocument: null,
				didResolutionMetadata: { error: "unsupportedPublicKeyType" },
				didDocumentMetadata: {},
			};
		}

		const keyId = `${did}#${did.split(":")[2]}`;
		const jwk = publicKeyToJwk(publicKey, algorithm);

		const didDocument: DIDDocument = {
			id: did,
			verificationMethod: [
				{
					id: keyId,
					type: "JsonWebKey2020",
					controller: did,
					publicKeyJwk: jwk,
				},
			],
			authentication: [keyId],
			assertionMethod: [keyId],
		};

		return {
			didDocument,
			didResolutionMetadata: {},
			didDocumentMetadata: {},
		};
	} catch {
		return {
			didDocument: null,
			didResolutionMetadata: { error: "invalidDid" },
			didDocumentMetadata: {},
		};
	}
}

// Base58btc encoding/decoding (Bitcoin alphabet)
const BASE58_ALPHABET =
	"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58btcEncode(bytes: Uint8Array): string {
	if (bytes.length === 0) return "";

	// Count leading zeros
	let zeros = 0;
	for (const b of bytes) {
		if (b !== 0) break;
		zeros++;
	}

	// Convert to big integer and divide
	const result: number[] = [];
	let num = bytes.reduce((acc, b) => acc * 256n + BigInt(b), 0n);

	while (num > 0n) {
		const remainder = Number(num % 58n);
		result.unshift(remainder);
		num = num / 58n;
	}

	// Add leading '1's for zero bytes
	const encoded =
		"1".repeat(zeros) + result.map((i) => BASE58_ALPHABET[i]).join("");
	return encoded;
}

function base58btcDecode(str: string): Uint8Array {
	if (str.length === 0) return new Uint8Array(0);

	// Count leading '1's
	let zeros = 0;
	for (const c of str) {
		if (c !== "1") break;
		zeros++;
	}

	// Convert from base58 to big integer
	let num = 0n;
	for (const c of str) {
		const index = BASE58_ALPHABET.indexOf(c);
		if (index === -1) throw new Error(`Invalid base58 character: ${c}`);
		num = num * 58n + BigInt(index);
	}

	// Convert big integer to bytes
	const bytes: number[] = [];
	while (num > 0n) {
		bytes.unshift(Number(num & 0xffn));
		num = num >> 8n;
	}

	// Add leading zero bytes
	const result = new Uint8Array(zeros + bytes.length);
	result.set(new Uint8Array(bytes), zeros);
	return result;
}
