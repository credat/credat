import { base64urlToUint8Array, uint8ArrayToBase64url } from "../crypto/keys";

export function jsonToBase64url(obj: unknown): string {
	const json = JSON.stringify(obj);
	return uint8ArrayToBase64url(new TextEncoder().encode(json));
}

export function base64urlToJson(str: string): Record<string, unknown> {
	const bytes = base64urlToUint8Array(str);
	const json = new TextDecoder().decode(bytes);
	return JSON.parse(json) as Record<string, unknown>;
}
