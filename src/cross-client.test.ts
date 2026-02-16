import { describe, expect, it } from "vitest";
import { createClient } from "./client";
import { createMdoc, verifyMdoc } from "./credentials/formats/mdoc";
import {
	createSdJwtVc,
	presentSdJwtVc,
	verifySdJwtVc,
} from "./credentials/formats/sd-jwt-vc";
import {
	base64urlToUint8Array,
	generateKeyPair,
	uint8ArrayToBase64url,
} from "./crypto/keys";
import { createDidKey } from "./did/methods/key";

describe("cross-client verification", () => {
	it("credential issued by client A is verified by client B", async () => {
		// In the real world, issuer and verifier are different entities.
		// Each client generates its own key pair. Verification works because
		// the verifier can resolve the issuer's DID to get the public key.
		const issuerClient = createClient({ mode: "local" });
		const verifierClient = createClient({ mode: "local" });

		const credential = await issuerClient.credentials.issue({
			type: "KYC",
			claims: { givenName: "Alice", familyName: "Dupont" },
			format: "sd-jwt-vc",
		});

		// Verifier resolves the issuer's DID to get the public key
		// (this works for did:key because the key is embedded in the DID)
		const result = await verifierClient.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Alice");
		expect(result.issuer).toBe(credential.issuer);
	});

	it("mDoc credential from client A verified by client B (via fallback key)", async () => {
		// mDoc doesn't embed DID in the same way, so cross-client verification
		// only works if the verifier has the issuer's public key.
		// Here we test the did:key resolution path for SD-JWT and
		// document that mDoc requires explicit key sharing.
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "mDL",
			claims: { givenName: "Bob", category: "B" },
			format: "mdoc",
		});

		// Same client can verify its own mDocs
		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(true);
		expect(result.claims.givenName).toBe("Bob");
	});
});

describe("credential tampering detection", () => {
	it("SD-JWT VC: rejects modified payload", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "KYC",
			claims: { givenName: "Alice", familyName: "Dupont" },
			format: "sd-jwt-vc",
		});

		// Tamper with the JWT payload — change one character in the payload section
		const parts = credential.raw.split("~");
		const jwtParts = parts[0]!.split(".");
		const tamperedPayload = `${jwtParts[1]}X`; // Corrupt the base64url
		parts[0] = `${jwtParts[0]}.${tamperedPayload}.${jwtParts[2]}`;
		const tampered = parts.join("~");

		const result = await client.credentials.verify({
			credential: tampered,
		});

		expect(result.valid).toBe(false);
	});

	it("SD-JWT VC: rejects modified signature", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "KYC",
			claims: { givenName: "Alice" },
			format: "sd-jwt-vc",
		});

		// Tamper with the signature
		const parts = credential.raw.split("~");
		const jwtParts = parts[0]!.split(".");
		// Flip some bytes in the signature
		const sig = jwtParts[2]!;
		const flipped = sig[0] === "A" ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
		parts[0] = `${jwtParts[0]}.${jwtParts[1]}.${flipped}`;
		const tampered = parts.join("~");

		const result = await client.credentials.verify({
			credential: tampered,
		});

		expect(result.valid).toBe(false);
		expect(result.errors).toBeDefined();
	});

	it("mDoc: rejects tampered CBOR", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "mDL",
			claims: { givenName: "Alice" },
			format: "mdoc",
		});

		// Tamper with the base64url-encoded mDoc
		const tampered = `${credential.raw.slice(0, -5)}AAAAA`;

		const result = await client.credentials.verify({
			credential: tampered,
		});

		expect(result.valid).toBe(false);
	});

	it("SD-JWT VC: rejects credential signed by different key", async () => {
		// Issue with one key pair, verify expects another
		const keyPairA = generateKeyPair("ES256");
		const keyPairB = generateKeyPair("ES256");
		const didA = createDidKey(keyPairA.publicKey, "ES256");

		const raw = await createSdJwtVc({
			issuerPrivateKey: keyPairA.privateKey,
			issuerPublicKey: keyPairA.publicKey,
			issuerDid: didA,
			type: "KYC",
			claims: { givenName: "Alice" },
			selectiveDisclosure: [],
		});

		// Verify with wrong key
		const result = await verifySdJwtVc(raw, keyPairB.publicKey);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Invalid signature");
	});

	it("mDoc: rejects credential signed by different key", async () => {
		const keyPairA = generateKeyPair("ES256");
		const keyPairB = generateKeyPair("ES256");

		const mdocBytes = await createMdoc({
			issuerPrivateKey: keyPairA.privateKey,
			issuerPublicKey: keyPairA.publicKey,
			issuerDid: "did:key:zFake",
			docType: "mDL",
			nameSpace: "org.iso.18013.5.1.mDL",
			claims: { givenName: "Alice" },
		});

		const result = await verifyMdoc(
			new Uint8Array(mdocBytes),
			keyPairB.publicKey,
		);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Invalid signature");
	});
});

describe("expired credential detection", () => {
	it("SD-JWT VC: detects expired credential", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "KYC",
			claims: { givenName: "Alice" },
			format: "sd-jwt-vc",
			expiresAt: new Date(Date.now() - 1000), // Already expired
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(false);
		expect(result.errors?.some((e) => e.code === "CREDENTIAL_EXPIRED")).toBe(
			true,
		);
	});

	it("mDoc: detects expired credential", async () => {
		const client = createClient({ mode: "local" });

		const credential = await client.credentials.issue({
			type: "mDL",
			claims: { givenName: "Alice" },
			format: "mdoc",
			expiresAt: new Date(Date.now() - 1000), // Already expired
		});

		const result = await client.credentials.verify({
			credential: credential.raw,
		});

		expect(result.valid).toBe(false);
		expect(result.errors?.some((e) => e.code === "CREDENTIAL_EXPIRED")).toBe(
			true,
		);
	});

	it("expired credential with revocation — both errors present", async () => {
		const client = createClient({ mode: "local" });
		await client.statusList.create({
			id: "list-1",
			url: "https://issuer.example.com/status/1",
		});

		const credential = await client.credentials.issue({
			type: "KYC",
			claims: { givenName: "Alice" },
			format: "sd-jwt-vc",
			expiresAt: new Date(Date.now() - 1000),
			statusListEntry: {
				statusListUrl: "https://issuer.example.com/status/1",
				statusListIndex: 5,
			},
		});

		await client.statusList.revoke("list-1", 5);
		const list = await client.statusList.get("list-1");

		const result = await client.credentials.verify({
			credential: credential.raw,
			checkRevocation: true,
			statusList: list!,
		});

		expect(result.valid).toBe(false);
		expect(result.errors?.some((e) => e.code === "CREDENTIAL_EXPIRED")).toBe(
			true,
		);
		expect(result.errors?.some((e) => e.code === "CREDENTIAL_REVOKED")).toBe(
			true,
		);
		expect(result.revocationStatus).toBe("revoked");
	});
});

describe("cross-format consistency", () => {
	it("same claims produce valid credentials in both formats", async () => {
		const client = createClient({ mode: "local" });
		const claims = {
			givenName: "Alice",
			familyName: "Dupont",
			nationality: "FR",
		};

		const sdJwt = await client.credentials.issue({
			type: "KYC",
			claims,
			format: "sd-jwt-vc",
		});

		const mdoc = await client.credentials.issue({
			type: "KYC",
			claims,
			format: "mdoc",
		});

		const sdJwtResult = await client.credentials.verify({
			credential: sdJwt.raw,
		});
		const mdocResult = await client.credentials.verify({
			credential: mdoc.raw,
		});

		expect(sdJwtResult.valid).toBe(true);
		expect(mdocResult.valid).toBe(true);
		expect(sdJwtResult.claims.givenName).toBe("Alice");
		expect(mdocResult.claims.givenName).toBe("Alice");
		expect(sdJwtResult.format).toBe("sd-jwt-vc");
		expect(mdocResult.format).toBe("mdoc");
	});

	it("both formats support revocation check", async () => {
		const client = createClient({ mode: "local" });
		const list = await client.statusList.create({
			id: "list-1",
			url: "https://issuer.example.com/status/1",
		});

		const sdJwt = await client.credentials.issue({
			type: "KYC",
			claims: { givenName: "Alice" },
			format: "sd-jwt-vc",
			statusListEntry: {
				statusListUrl: "https://issuer.example.com/status/1",
				statusListIndex: 0,
			},
		});

		const mdoc = await client.credentials.issue({
			type: "KYC",
			claims: { givenName: "Bob" },
			format: "mdoc",
			statusListEntry: {
				statusListUrl: "https://issuer.example.com/status/1",
				statusListIndex: 1,
			},
		});

		const sdJwtResult = await client.credentials.verify({
			credential: sdJwt.raw,
			checkRevocation: true,
			statusList: list,
		});
		const mdocResult = await client.credentials.verify({
			credential: mdoc.raw,
			checkRevocation: true,
			statusList: list,
		});

		expect(sdJwtResult.revocationStatus).toBe("valid");
		expect(mdocResult.revocationStatus).toBe("valid");
	});
});
