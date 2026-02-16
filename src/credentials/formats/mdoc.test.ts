import { describe, expect, it } from "vitest";
import { generateKeyPair } from "../../crypto";
import { createMdoc, verifyMdoc } from "./mdoc";

describe("mDoc", () => {
	const issuerKp = generateKeyPair("ES256");

	it("creates an mDoc with claims", async () => {
		const mdoc = await createMdoc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			docType: "org.iso.18013.5.1.mDL",
			nameSpace: "org.iso.18013.5.1",
			claims: {
				given_name: "Alice",
				family_name: "Dupont",
				birth_date: "1990-01-15",
			},
		});

		expect(mdoc).toBeInstanceOf(Uint8Array);
		expect(mdoc.length).toBeGreaterThan(0);
	});

	it("verifies a valid mDoc", async () => {
		const mdoc = await createMdoc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			docType: "org.iso.18013.5.1.mDL",
			nameSpace: "org.iso.18013.5.1",
			claims: {
				given_name: "Alice",
				family_name: "Dupont",
			},
		});

		const result = await verifyMdoc(mdoc, issuerKp.publicKey);
		expect(result.valid).toBe(true);
		expect(result.claims.given_name).toBe("Alice");
		expect(result.claims.family_name).toBe("Dupont");
	});

	it("returns correct metadata", async () => {
		const mdoc = await createMdoc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			docType: "org.iso.18013.5.1.mDL",
			nameSpace: "org.iso.18013.5.1",
			claims: { given_name: "Alice" },
		});

		const result = await verifyMdoc(mdoc, issuerKp.publicKey);
		expect(result.valid).toBe(true);
		expect(result.issuer).toBe("did:key:ztest");
		expect(result.docType).toBe("org.iso.18013.5.1.mDL");
		expect(result.format).toBe("mdoc");
		expect(result.issuedAt).toBeInstanceOf(Date);
	});

	it("rejects wrong issuer key", async () => {
		const wrongKp = generateKeyPair("ES256");

		const mdoc = await createMdoc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			docType: "org.iso.18013.5.1.mDL",
			nameSpace: "org.iso.18013.5.1",
			claims: { given_name: "Alice" },
		});

		const result = await verifyMdoc(mdoc, wrongKp.publicKey);
		expect(result.valid).toBe(false);
	});

	it("rejects tampered mDoc", async () => {
		const mdoc = await createMdoc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			docType: "org.iso.18013.5.1.mDL",
			nameSpace: "org.iso.18013.5.1",
			claims: { given_name: "Alice" },
		});

		// Tamper with the bytes
		const tampered = new Uint8Array(mdoc);
		tampered[tampered.length - 10] = tampered[tampered.length - 10]! ^ 0xff;

		const result = await verifyMdoc(tampered, issuerKp.publicKey);
		expect(result.valid).toBe(false);
	});

	it("handles expiration date", async () => {
		const expires = new Date("2030-12-31T23:59:59Z");
		const mdoc = await createMdoc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			docType: "org.iso.18013.5.1.mDL",
			nameSpace: "org.iso.18013.5.1",
			claims: { given_name: "Alice" },
			expiresAt: expires,
		});

		const result = await verifyMdoc(mdoc, issuerKp.publicKey);
		expect(result.valid).toBe(true);
		expect(result.expiresAt).toEqual(expires);
	});
});
