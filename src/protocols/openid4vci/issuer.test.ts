import { beforeEach, describe, expect, it } from "vitest";
import { verifySdJwtVc } from "../../credentials/formats/sd-jwt-vc";
import { generateKeyPair } from "../../crypto/keys";
import { ProtocolError } from "../../errors";
import { CredentialIssuer, type CredentialIssuerConfig } from "./issuer";

function createTestConfig(): CredentialIssuerConfig {
	const kp = generateKeyPair("ES256");
	return {
		issuerUrl: "https://issuer.example.com",
		issuerDid: "did:key:zTest123",
		signingKeyId: "key-1",
		privateKey: kp.privateKey,
		publicKey: kp.publicKey,
		tokenExpirySeconds: 300,
		offerExpirySeconds: 600,
	};
}

describe("CredentialIssuer", () => {
	let issuer: CredentialIssuer;
	let config: CredentialIssuerConfig;

	beforeEach(() => {
		config = createTestConfig();
		issuer = new CredentialIssuer(config);
	});

	describe("createOffer", () => {
		it("creates credential offer with URI", () => {
			const { offer, offerUri } = issuer.createOffer({
				credentialType: "IdentityCredential",
				claims: { givenName: "Alice", familyName: "Smith" },
			});

			expect(offer.credential_issuer).toBe("https://issuer.example.com");
			expect(offer.credential_configuration_ids).toEqual([
				"IdentityCredential",
			]);
			expect(
				offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
					"pre-authorized_code"
				],
			).toBeTruthy();
			expect(offerUri).toMatch(
				/^openid-credential-offer:\/\/\?credential_offer=/,
			);
		});
	});

	describe("exchangePreAuthorizedCode", () => {
		it("exchanges pre-authorized code for access token", () => {
			const { offer } = issuer.createOffer({
				credentialType: "IdentityCredential",
				claims: { givenName: "Alice" },
			});

			const code =
				offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
					"pre-authorized_code"
				];
			const tokenResponse = issuer.exchangePreAuthorizedCode(code);

			expect(tokenResponse.access_token).toBeTruthy();
			expect(tokenResponse.token_type).toBe("Bearer");
			expect(tokenResponse.expires_in).toBe(300);
			expect(tokenResponse.c_nonce).toBeTruthy();
		});

		it("rejects invalid pre-authorized code", () => {
			expect(() => issuer.exchangePreAuthorizedCode("invalid-code")).toThrow(
				ProtocolError,
			);
		});

		it("rejects already-used pre-authorized code", () => {
			const { offer } = issuer.createOffer({
				credentialType: "IdentityCredential",
				claims: { givenName: "Alice" },
			});

			const code =
				offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
					"pre-authorized_code"
				];
			issuer.exchangePreAuthorizedCode(code); // First use

			expect(() => issuer.exchangePreAuthorizedCode(code)).toThrow(
				ProtocolError,
			);
		});

		it("rejects expired pre-authorized code", () => {
			const shortLivedIssuer = new CredentialIssuer({
				...config,
				offerExpirySeconds: 0, // Expires immediately
			});

			const { offer } = shortLivedIssuer.createOffer({
				credentialType: "IdentityCredential",
				claims: { givenName: "Alice" },
			});

			const code =
				offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
					"pre-authorized_code"
				];
			expect(() => shortLivedIssuer.exchangePreAuthorizedCode(code)).toThrow(
				ProtocolError,
			);
		});
	});

	describe("issueCredential", () => {
		it("issues SD-JWT VC credential", async () => {
			const { offer } = issuer.createOffer({
				credentialType: "IdentityCredential",
				claims: { givenName: "Alice", familyName: "Smith" },
				selectiveDisclosure: ["givenName"],
			});

			const code =
				offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
					"pre-authorized_code"
				];
			const tokenResponse = issuer.exchangePreAuthorizedCode(code);
			const { response, credential } = await issuer.issueCredential(
				tokenResponse.access_token,
				"vc+sd-jwt",
			);

			expect(response.format).toBe("vc+sd-jwt");
			expect(response.credential).toContain("~"); // SD-JWT has tildes
			expect(credential.format).toBe("sd-jwt-vc");
			expect(credential.type).toBe("IdentityCredential");
			expect(credential.issuer).toBe(config.issuerDid);
			expect(credential.claims).toEqual({
				givenName: "Alice",
				familyName: "Smith",
			});
			expect(credential.id).toMatch(/^urn:uuid:/);

			// Verify the issued credential
			const verifyResult = await verifySdJwtVc(
				response.credential,
				config.publicKey,
			);
			expect(verifyResult.valid).toBe(true);
			expect(verifyResult.claims.familyName).toBe("Smith");
		});

		it("rejects invalid access token", async () => {
			await expect(issuer.issueCredential("invalid-token")).rejects.toThrow(
				ProtocolError,
			);
		});

		it("rejects already-used access token", async () => {
			const { offer } = issuer.createOffer({
				credentialType: "IdentityCredential",
				claims: { givenName: "Alice" },
			});

			const code =
				offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
					"pre-authorized_code"
				];
			const tokenResponse = issuer.exchangePreAuthorizedCode(code);
			await issuer.issueCredential(tokenResponse.access_token); // First use

			await expect(
				issuer.issueCredential(tokenResponse.access_token),
			).rejects.toThrow(ProtocolError);
		});

		it("rejects expired access token", async () => {
			const shortLivedIssuer = new CredentialIssuer({
				...config,
				tokenExpirySeconds: 0, // Expires immediately
			});

			const { offer } = shortLivedIssuer.createOffer({
				credentialType: "IdentityCredential",
				claims: { givenName: "Alice" },
			});

			const code =
				offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
					"pre-authorized_code"
				];
			const tokenResponse = shortLivedIssuer.exchangePreAuthorizedCode(code);

			await expect(
				shortLivedIssuer.issueCredential(tokenResponse.access_token),
			).rejects.toThrow(ProtocolError);
		});
	});

	describe("getMetadata", () => {
		it("returns issuer metadata with supported formats", () => {
			const metadata = issuer.getMetadata();

			expect(metadata.credential_issuer).toBe("https://issuer.example.com");
			expect(metadata.credential_endpoint).toBe(
				"https://issuer.example.com/credential",
			);
			expect(metadata.token_endpoint).toBe("https://issuer.example.com/token");
			expect(
				metadata.credential_configurations_supported["sd-jwt-vc"],
			).toBeDefined();
		});
	});
});
