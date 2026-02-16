import { gunzipSync, gzipSync } from "node:zlib";
import { base64urlToUint8Array, uint8ArrayToBase64url } from "../crypto/keys";
import { sign, verifySignature } from "../crypto/sign";
import { CredentialError, ErrorCodes } from "../errors";
import type { StatusListData } from "../types";
import { base64urlToJson, jsonToBase64url } from "./utils";

// Minimum 131,072 entries per W3C Status List spec (herd privacy)
const MIN_STATUS_LIST_SIZE = 131_072;

export interface CreateStatusListOptions {
	id: string;
	issuer: string;
	url: string;
	size?: number;
}

export function createStatusList(
	options: CreateStatusListOptions,
): StatusListData {
	const size = options.size ?? MIN_STATUS_LIST_SIZE;

	if (size < MIN_STATUS_LIST_SIZE) {
		throw new CredentialError(
			ErrorCodes.STATUS_LIST_INVALID,
			`Status list size must be at least ${MIN_STATUS_LIST_SIZE} (got ${size})`,
		);
	}

	// Each byte holds 8 status bits
	const byteLength = Math.ceil(size / 8);
	const bitstring = new Uint8Array(byteLength);

	return {
		bitstring,
		issuer: options.issuer,
		id: options.id,
		size,
	};
}

export function setRevocationStatus(
	list: StatusListData,
	index: number,
	revoked: boolean,
): void {
	if (index < 0 || index >= list.size) {
		throw new CredentialError(
			ErrorCodes.STATUS_LIST_INVALID,
			`Index ${index} out of range [0, ${list.size - 1}]`,
		);
	}

	const byteIndex = Math.floor(index / 8);
	// MSB-first per spec: bit 0 of an entry is the most-significant bit of its byte
	const bitMask = 0x80 >> (index % 8);

	if (revoked) {
		list.bitstring[byteIndex]! |= bitMask;
	} else {
		list.bitstring[byteIndex]! &= ~bitMask;
	}
}

export function isRevoked(list: StatusListData, index: number): boolean {
	if (index < 0 || index >= list.size) {
		throw new CredentialError(
			ErrorCodes.STATUS_LIST_INVALID,
			`Index ${index} out of range [0, ${list.size - 1}]`,
		);
	}

	const byteIndex = Math.floor(index / 8);
	const bitMask = 0x80 >> (index % 8);

	return (list.bitstring[byteIndex]! & bitMask) !== 0;
}

export function encodeStatusList(bitstring: Uint8Array): string {
	const compressed = gzipSync(bitstring);
	return uint8ArrayToBase64url(compressed);
}

export function decodeStatusList(encoded: string): Uint8Array {
	const compressed = base64urlToUint8Array(encoded);
	return new Uint8Array(gunzipSync(compressed));
}

export interface CreateStatusListCredentialOptions {
	list: StatusListData;
	issuerPrivateKey: Uint8Array;
	url: string;
}

export function createStatusListCredential(
	options: CreateStatusListCredentialOptions,
): string {
	const { list, issuerPrivateKey, url } = options;

	const header = {
		alg: "ES256",
		typ: "statuslist+jwt",
	};

	const encoded = encodeStatusList(list.bitstring);

	const payload: Record<string, unknown> = {
		iss: list.issuer,
		sub: url,
		iat: Math.floor(Date.now() / 1000),
		status_list: {
			bits: 1,
			lst: encoded,
		},
	};

	const headerB64 = jsonToBase64url(header);
	const payloadB64 = jsonToBase64url(payload);
	const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
	const signature = sign(signingInput, issuerPrivateKey, "ES256");
	const signatureB64 = uint8ArrayToBase64url(signature);

	return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export interface VerifyStatusListCredentialResult {
	valid: boolean;
	bitstring?: Uint8Array;
	issuer?: string;
	errors?: string[];
}

export function verifyStatusListCredential(
	jwt: string,
	publicKey: Uint8Array,
): VerifyStatusListCredentialResult {
	try {
		const parts = jwt.split(".");
		if (parts.length !== 3) {
			return { valid: false, errors: ["Invalid JWT format"] };
		}

		const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
		const signatureBytes = base64urlToUint8Array(parts[2]!);
		const valid = verifySignature(
			signingInput,
			signatureBytes,
			publicKey,
			"ES256",
		);

		if (!valid) {
			return { valid: false, errors: ["Invalid signature"] };
		}

		const payload = base64urlToJson(parts[1]!) as {
			iss?: string;
			status_list?: { bits?: number; lst?: string };
		};

		if (!payload.status_list?.lst) {
			return { valid: false, errors: ["Missing status_list.lst"] };
		}

		const bitstring = decodeStatusList(payload.status_list.lst);

		return {
			valid: true,
			bitstring,
			issuer: payload.iss as string,
		};
	} catch (error) {
		return { valid: false, errors: [(error as Error).message] };
	}
}
