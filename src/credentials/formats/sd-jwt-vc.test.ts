import { describe, expect, it } from "vitest";
import { generateKeyPair } from "../../crypto";
import { createSdJwtVc, selectDisclosures, verifySdJwtVc } from "./sd-jwt-vc";

describe("SD-JWT VC", () => {
	const issuerKp = generateKeyPair("ES256");

	it("creates an SD-JWT VC with claims", async () => {
		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "KYCVerification",
			claims: {
				givenName: "Alice",
				familyName: "Dupont",
				dateOfBirth: "1990-01-15",
			},
			selectiveDisclosure: ["dateOfBirth"],
		});

		// Has trailing tilde (spec-mandated)
		expect(sdJwt).toMatch(/~$/);
		// Has at least: JWT ~ disclosure ~ trailing
		expect(sdJwt.split("~").length).toBeGreaterThanOrEqual(3);
	});

	it("verifies a valid SD-JWT VC", async () => {
		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "KYCVerification",
			claims: {
				givenName: "Alice",
				familyName: "Dupont",
			},
			selectiveDisclosure: [],
		});

		const result = await verifySdJwtVc(sdJwt, issuerKp.publicKey);
		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Alice");
		expect(result.claims.familyName).toBe("Dupont");
	});

	it("supports selective disclosure", async () => {
		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "KYCVerification",
			claims: {
				givenName: "Alice",
				familyName: "Dupont",
				dateOfBirth: "1990-01-15",
				nationality: "FR",
			},
			selectiveDisclosure: ["dateOfBirth", "nationality"],
		});

		// Present only givenName and familyName (hide dateOfBirth and nationality)
		const presentation = selectDisclosures(sdJwt, ["givenName", "familyName"]);

		const result = await verifySdJwtVc(presentation, issuerKp.publicKey);
		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Alice");
		expect(result.claims.familyName).toBe("Dupont");
		// Selectively disclosed claims should NOT be present
		expect(result.claims.dateOfBirth).toBeUndefined();
		expect(result.claims.nationality).toBeUndefined();
	});

	it("reveals selectively disclosable claims when included in presentation", async () => {
		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "KYCVerification",
			claims: {
				givenName: "Alice",
				dateOfBirth: "1990-01-15",
			},
			selectiveDisclosure: ["dateOfBirth"],
		});

		// Present all claims including dateOfBirth
		const presentation = selectDisclosures(sdJwt, ["givenName", "dateOfBirth"]);

		const result = await verifySdJwtVc(presentation, issuerKp.publicKey);
		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Alice");
		expect(result.claims.dateOfBirth).toBe("1990-01-15");
	});

	it("rejects tampered SD-JWT VC", async () => {
		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "Test",
			claims: { name: "Alice" },
			selectiveDisclosure: [],
		});

		// Tamper with the JWT part
		const parts = sdJwt.split("~");
		parts[0] = `${parts[0]?.slice(0, -5)}XXXXX`;
		const tampered = parts.join("~");

		const result = await verifySdJwtVc(tampered, issuerKp.publicKey);
		expect(result.valid).toBe(false);
	});

	it("rejects wrong issuer key", async () => {
		const wrongKp = generateKeyPair("ES256");

		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "Test",
			claims: { name: "Alice" },
			selectiveDisclosure: [],
		});

		const result = await verifySdJwtVc(sdJwt, wrongKp.publicKey);
		expect(result.valid).toBe(false);
	});

	it("includes standard VC claims (iss, iat, vct)", async () => {
		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "KYCVerification",
			claims: { name: "Alice" },
			selectiveDisclosure: [],
		});

		const result = await verifySdJwtVc(sdJwt, issuerKp.publicKey);
		expect(result.issuer).toBe("did:key:ztest");
		expect(result.issuedAt).toBeInstanceOf(Date);
		expect(result.format).toBe("sd-jwt-vc");
	});

	it("uses dc+sd-jwt typ header per draft-14", async () => {
		const sdJwt = await createSdJwtVc({
			issuerPrivateKey: issuerKp.privateKey,
			issuerPublicKey: issuerKp.publicKey,
			issuerDid: "did:key:ztest",
			type: "Test",
			claims: { name: "Alice" },
			selectiveDisclosure: [],
		});

		// Decode header
		const headerB64 = sdJwt.split(".")[0] ?? "";
		const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
		expect(header.typ).toBe("dc+sd-jwt");
		expect(header.alg).toBe("ES256");
	});
});
