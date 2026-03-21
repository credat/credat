import { describe, expect, it } from "vitest";
import { base64urlToUint8Array, generateKeyPair } from "../../crypto/keys";
import {
	createStatusList,
	createStatusListCredential,
	decodeStatusList,
	encodeStatusList,
	isRevoked,
	setRevocationStatus,
	verifyStatusListCredential,
} from "./status-list";

describe("Status List", () => {
	// === createStatusList ===

	it("creates a status list with default size (131072)", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		expect(list.size).toBe(131_072);
		expect(list.bitstring.length).toBe(131_072 / 8);
		expect(list.issuer).toBe("did:key:z123");
		expect(list.id).toBe("list-1");
	});

	it("creates a status list with custom size", () => {
		const list = createStatusList({
			id: "list-2",
			issuer: "did:key:z123",
			url: "https://example.com/status/2",
			size: 262_144,
		});
		expect(list.size).toBe(262_144);
		expect(list.bitstring.length).toBe(262_144 / 8);
	});

	it("rejects size below minimum", () => {
		expect(() =>
			createStatusList({
				id: "list-3",
				issuer: "did:key:z123",
				url: "https://example.com/status/3",
				size: 1000,
			}),
		).toThrow("at least 131072");
	});

	// === setRevocationStatus / isRevoked ===

	it("all entries start as valid (0)", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		expect(isRevoked(list, 0)).toBe(false);
		expect(isRevoked(list, 7)).toBe(false);
		expect(isRevoked(list, 8)).toBe(false);
		expect(isRevoked(list, 131_071)).toBe(false);
	});

	it("revokes and checks at index 0", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 0, true);
		expect(isRevoked(list, 0)).toBe(true);
		expect(isRevoked(list, 1)).toBe(false);
	});

	it("revokes and checks at index 7 (last bit of first byte)", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 7, true);
		expect(isRevoked(list, 7)).toBe(true);
		expect(isRevoked(list, 6)).toBe(false);
		expect(isRevoked(list, 8)).toBe(false);
	});

	it("revokes and checks at index 8 (first bit of second byte)", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 8, true);
		expect(isRevoked(list, 8)).toBe(true);
		expect(isRevoked(list, 7)).toBe(false);
		expect(isRevoked(list, 9)).toBe(false);
	});

	it("revokes at last index", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 131_071, true);
		expect(isRevoked(list, 131_071)).toBe(true);
	});

	it("handles multiple revocations", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 0, true);
		setRevocationStatus(list, 42, true);
		setRevocationStatus(list, 100_000, true);
		expect(isRevoked(list, 0)).toBe(true);
		expect(isRevoked(list, 42)).toBe(true);
		expect(isRevoked(list, 100_000)).toBe(true);
		expect(isRevoked(list, 1)).toBe(false);
		expect(isRevoked(list, 43)).toBe(false);
	});

	it("unrevokes a credential", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 42, true);
		expect(isRevoked(list, 42)).toBe(true);
		setRevocationStatus(list, 42, false);
		expect(isRevoked(list, 42)).toBe(false);
	});

	it("throws on out-of-range index", () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		expect(() => setRevocationStatus(list, -1, true)).toThrow("out of range");
		expect(() => setRevocationStatus(list, 131_072, true)).toThrow(
			"out of range",
		);
		expect(() => isRevoked(list, -1)).toThrow("out of range");
		expect(() => isRevoked(list, 131_072)).toThrow("out of range");
	});

	// === encode / decode ===

	it("round-trips encode/decode", async () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 0, true);
		setRevocationStatus(list, 42, true);

		const encoded = await encodeStatusList(list.bitstring);
		expect(typeof encoded).toBe("string");

		const decoded = await decodeStatusList(encoded);
		expect(decoded).toEqual(list.bitstring);
	});

	it("compresses efficiently (mostly-zero bitstring)", async () => {
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		const encoded = await encodeStatusList(list.bitstring);
		// Gzip of 16KB of zeros should be much smaller than 16KB
		const compressedBytes = base64urlToUint8Array(encoded);
		expect(compressedBytes.length).toBeLessThan(list.bitstring.length / 2);
	});

	// === JWT create / verify ===

	it("creates and verifies a status list credential JWT", async () => {
		const keyPair = generateKeyPair("ES256");
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});
		setRevocationStatus(list, 42, true);

		const jwt = await createStatusListCredential({
			list,
			issuerPrivateKey: keyPair.privateKey,
			url: "https://example.com/status/1",
		});

		expect(typeof jwt).toBe("string");
		expect(jwt.split(".").length).toBe(3);

		const result = await verifyStatusListCredential(jwt, keyPair.publicKey);
		expect(result.valid).toBe(true);
		expect(result.issuer).toBe("did:key:z123");
		expect(result.bitstring).toBeDefined();

		// Verify the decoded bitstring has the revocation
		const reconstructed = createStatusList({ id: "tmp", issuer: "", url: "" });
		reconstructed.bitstring = result.bitstring ?? new Uint8Array(0);
		reconstructed.size = (result.bitstring?.length ?? 0) * 8;
		expect(isRevoked(reconstructed, 42)).toBe(true);
		expect(isRevoked(reconstructed, 0)).toBe(false);
	});

	it("rejects tampered JWT", async () => {
		const keyPair = generateKeyPair("ES256");
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});

		const jwt = await createStatusListCredential({
			list,
			issuerPrivateKey: keyPair.privateKey,
			url: "https://example.com/status/1",
		});

		// Tamper with the payload
		const parts = jwt.split(".");
		const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
		const result = await verifyStatusListCredential(
			tampered,
			keyPair.publicKey,
		);
		expect(result.valid).toBe(false);
	});

	it("rejects JWT signed with wrong key", async () => {
		const issuerKeys = generateKeyPair("ES256");
		const wrongKeys = generateKeyPair("ES256");
		const list = createStatusList({
			id: "list-1",
			issuer: "did:key:z123",
			url: "https://example.com/status/1",
		});

		const jwt = await createStatusListCredential({
			list,
			issuerPrivateKey: issuerKeys.privateKey,
			url: "https://example.com/status/1",
		});

		const result = await verifyStatusListCredential(jwt, wrongKeys.publicKey);
		expect(result.valid).toBe(false);
		expect(result.errors).toBeDefined();
	});
});
