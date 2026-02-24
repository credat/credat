import { beforeEach, describe, expect, it } from "vitest";
import { presentSdJwtVc } from "../../credentials/formats/sd-jwt-vc";
import { generateKeyPair } from "../../crypto/keys";
import { ProtocolError } from "../../errors";
import {
	CredentialIssuer,
	type CredentialIssuerConfig,
} from "../openid4vci/issuer";
import type { AuthorizationResponse, PresentationSubmission } from "./types";
import { CredentialVerifier, type CredentialVerifierConfig } from "./verifier";

function createIssuerConfig(): CredentialIssuerConfig {
	const kp = generateKeyPair("ES256");
	return {
		issuerUrl: "https://issuer.example.com",
		issuerDid: "did:key:zIssuer123",
		signingKeyId: "key-1",
		privateKey: kp.privateKey,
		publicKey: kp.publicKey,
	};
}

function createVerifierConfig(
	overrides?: Partial<CredentialVerifierConfig>,
): CredentialVerifierConfig {
	return {
		clientId: "https://verifier.example.com",
		redirectUri: "https://verifier.example.com/callback",
		requestExpirySeconds: 300,
		...overrides,
	};
}

async function issueTestCredential(
	issuerConfig: CredentialIssuerConfig,
	overrides?: {
		format?: "vc+sd-jwt";
		sd?: string[];
		expiresAt?: Date;
	},
) {
	const issuer = new CredentialIssuer(issuerConfig);
	const { offer } = issuer.createOffer({
		credentialType: "IdentityCredential",
		claims: {
			givenName: "Alice",
			familyName: "Smith",
			dateOfBirth: "1990-01-01",
		},
		selectiveDisclosure: overrides?.sd ?? ["dateOfBirth"],
		expiresAt: overrides?.expiresAt,
	});

	const code =
		offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"][
			"pre-authorized_code"
		];
	const tokenResponse = issuer.exchangePreAuthorizedCode(code);
	return issuer.issueCredential(
		tokenResponse.access_token,
		overrides?.format ?? "vc+sd-jwt",
	);
}

function buildVpResponse(
	vpToken: string,
	format: "vc+sd-jwt",
	state: string,
): AuthorizationResponse {
	const submission: PresentationSubmission = {
		id: "submission-1",
		definition_id: "def-1",
		descriptor_map: [{ id: "IdentityCredential", format, path: "$" }],
	};

	return { vp_token: vpToken, presentation_submission: submission, state };
}

describe("CredentialVerifier", () => {
	let issuerConfig: CredentialIssuerConfig;
	let verifierConfig: CredentialVerifierConfig;
	let verifier: CredentialVerifier;

	beforeEach(() => {
		issuerConfig = createIssuerConfig();
		verifierConfig = createVerifierConfig();
		verifier = new CredentialVerifier(verifierConfig);
	});

	describe("createAuthorizationRequest", () => {
		it("creates authorization request with request URI", () => {
			const { request, requestUri } = verifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName", "familyName"],
			});

			expect(request.response_type).toBe("vp_token");
			expect(request.client_id).toBe("https://verifier.example.com");
			expect(request.redirect_uri).toBe(
				"https://verifier.example.com/callback",
			);
			expect(request.nonce).toBeTruthy();
			expect(request.state).toBeTruthy();
			expect(request.presentation_definition.input_descriptors).toHaveLength(1);
			expect(
				request.presentation_definition.input_descriptors[0]?.constraints
					.fields,
			).toHaveLength(2);
			expect(requestUri).toMatch(/^openid4vp:\/\/\?/);
		});

		it("builds presentation definition with required claims", () => {
			const { request } = verifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName", "dateOfBirth"],
				purpose: "Age verification",
			});

			const descriptor = request.presentation_definition.input_descriptors[0]!;
			expect(descriptor.name).toBe("IdentityCredential");
			expect(descriptor.purpose).toBe("Age verification");
			expect(descriptor.constraints.fields[0]?.path).toContain("$.givenName");
			expect(descriptor.constraints.fields[1]?.path).toContain("$.dateOfBirth");
		});
	});

	describe("processResponse", () => {
		it("verifies SD-JWT VP token and extracts claims", async () => {
			const { response: credResponse } =
				await issueTestCredential(issuerConfig);

			const { request } = verifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName", "familyName"],
			});

			// Wallet presents the credential (revealing all claims)
			const vpResponse = buildVpResponse(
				credResponse.credential,
				"vc+sd-jwt",
				request.state,
			);
			const result = await verifier.processResponse(
				vpResponse,
				issuerConfig.publicKey,
			);

			expect(result.valid).toBe(true);
			expect(result.format).toBe("sd-jwt-vc");
			expect(result.claims.givenName).toBe("Alice");
			expect(result.claims.familyName).toBe("Smith");
			expect(result.issuer).toBe(issuerConfig.issuerDid);
			expect(result.requestedClaimsPresent).toBe(true);
		});

		it("handles selective disclosure — only requested claims", async () => {
			const { response: credResponse } = await issueTestCredential(
				issuerConfig,
				{
					sd: ["givenName", "dateOfBirth"],
				},
			);

			const { request } = verifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["familyName"],
			});

			// Wallet presents only familyName (non-SD claim) — withhold SD claims
			const presented = presentSdJwtVc(credResponse.credential, []);
			const vpResponse = buildVpResponse(presented, "vc+sd-jwt", request.state);
			const result = await verifier.processResponse(
				vpResponse,
				issuerConfig.publicKey,
			);

			expect(result.valid).toBe(true);
			expect(result.claims.familyName).toBe("Smith");
			expect(result.claims.givenName).toBeUndefined(); // withheld
			expect(result.claims.dateOfBirth).toBeUndefined(); // withheld
			expect(result.requestedClaimsPresent).toBe(true); // familyName is present
		});

		it("detects missing required claims in presentation", async () => {
			const { response: credResponse } = await issueTestCredential(
				issuerConfig,
				{
					sd: ["givenName", "dateOfBirth"],
				},
			);

			const { request } = verifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName", "dateOfBirth"],
			});

			// Wallet reveals only givenName but not dateOfBirth
			const presented = presentSdJwtVc(credResponse.credential, ["givenName"]);
			const vpResponse = buildVpResponse(presented, "vc+sd-jwt", request.state);
			const result = await verifier.processResponse(
				vpResponse,
				issuerConfig.publicKey,
			);

			expect(result.valid).toBe(true); // Signature valid
			expect(result.requestedClaimsPresent).toBe(false); // Missing dateOfBirth
		});

		it("rejects expired credentials", async () => {
			const { response: credResponse } = await issueTestCredential(
				issuerConfig,
				{
					expiresAt: new Date(Date.now() - 1000), // Already expired
				},
			);

			const { request } = verifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName"],
			});

			const vpResponse = buildVpResponse(
				credResponse.credential,
				"vc+sd-jwt",
				request.state,
			);
			const result = await verifier.processResponse(
				vpResponse,
				issuerConfig.publicKey,
			);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Credential has expired");
		});

		it("rejects untrusted issuer", async () => {
			const trustedVerifier = new CredentialVerifier({
				...verifierConfig,
				trustedIssuers: ["did:key:zTrustedOnly"],
			});

			const { response: credResponse } =
				await issueTestCredential(issuerConfig);

			const { request } = trustedVerifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName"],
			});

			const vpResponse = buildVpResponse(
				credResponse.credential,
				"vc+sd-jwt",
				request.state,
			);
			const result = await trustedVerifier.processResponse(
				vpResponse,
				issuerConfig.publicKey,
			);

			expect(result.valid).toBe(false);
			expect(result.errors?.[0]).toContain("not trusted");
		});

		it("rejects unknown state", async () => {
			const vpResponse = buildVpResponse(
				"some-token",
				"vc+sd-jwt",
				"unknown-state",
			);
			await expect(verifier.processResponse(vpResponse)).rejects.toThrow(
				ProtocolError,
			);
		});

		it("rejects already-used state", async () => {
			const { response: credResponse } =
				await issueTestCredential(issuerConfig);

			const { request } = verifier.createAuthorizationRequest({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName"],
			});

			const vpResponse = buildVpResponse(
				credResponse.credential,
				"vc+sd-jwt",
				request.state,
			);
			await verifier.processResponse(vpResponse, issuerConfig.publicKey); // First use

			await expect(
				verifier.processResponse(vpResponse, issuerConfig.publicKey),
			).rejects.toThrow(ProtocolError);
		});
	});

	describe("buildPresentationDefinition (static)", () => {
		it("builds definition for sd-jwt-vc format", () => {
			const pd = CredentialVerifier.buildPresentationDefinition({
				credentialType: "IdentityCredential",
				requiredClaims: ["givenName"],
				format: "sd-jwt-vc",
			});

			expect(pd.input_descriptors[0]?.format?.["vc+sd-jwt"]).toBeDefined();
		});
	});
});
