import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import { verifyMdoc } from "../../credentials/formats/mdoc";
import { verifySdJwtVc } from "../../credentials/formats/sd-jwt-vc";
import { base64urlToUint8Array, jwkToPublicKey } from "../../crypto/keys";
import { resolveDID } from "../../did/resolver";
import { ErrorCodes, ProtocolError } from "../../errors";
import type {
	AuthorizationRequest,
	AuthorizationResponse,
	InputDescriptor,
	PendingRequest,
	PresentationDefinition,
	PresentationRequestParams,
	VerifiedPresentation,
} from "./types";

export interface CredentialVerifierConfig {
	clientId: string;
	redirectUri: string;
	requestExpirySeconds?: number;
	trustedIssuers?: string[];
}

const DEFAULT_REQUEST_EXPIRY = 300; // 5 minutes

export class CredentialVerifier {
	private pendingRequests = new Map<string, PendingRequest>();
	private config: CredentialVerifierConfig;

	constructor(config: CredentialVerifierConfig) {
		this.config = {
			...config,
			requestExpirySeconds:
				config.requestExpirySeconds ?? DEFAULT_REQUEST_EXPIRY,
		};
	}

	// === Authorization Request ===

	createAuthorizationRequest(params: PresentationRequestParams): {
		request: AuthorizationRequest;
		requestUri: string;
	} {
		const nonce = generateRandomToken();
		const state = generateRandomToken();
		const now = new Date();
		const expiresAt = new Date(
			now.getTime() + this.config.requestExpirySeconds! * 1000,
		);

		this.pendingRequests.set(state, {
			nonce,
			state,
			params,
			createdAt: now,
			expiresAt,
		});

		const presentationDefinition = buildPresentationDefinition(params);

		const request: AuthorizationRequest = {
			response_type: "vp_token",
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
			nonce,
			state,
			presentation_definition: presentationDefinition,
		};

		const requestUri = `openid4vp://?${new URLSearchParams({
			response_type: "vp_token",
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
			nonce,
			state,
			presentation_definition: JSON.stringify(presentationDefinition),
		}).toString()}`;

		return { request, requestUri };
	}

	// === Response Processing ===

	async processResponse(
		response: AuthorizationResponse,
		issuerPublicKey?: Uint8Array,
	): Promise<VerifiedPresentation> {
		const pending = this.pendingRequests.get(response.state);

		if (!pending) {
			throw new ProtocolError(
				ErrorCodes.OPENID4VP_FAILED,
				"Unknown or invalid state parameter",
				"The verification request is invalid or has already been processed.",
			);
		}

		if (new Date() >= pending.expiresAt) {
			this.pendingRequests.delete(response.state);
			throw new ProtocolError(
				ErrorCodes.OPENID4VP_FAILED,
				"Authorization request has expired",
				"The verification request has expired. Please start a new verification.",
			);
		}

		// Consume the request (single use)
		this.pendingRequests.delete(response.state);

		const { vp_token, presentation_submission } = response;

		// Determine format from presentation submission
		const format = presentation_submission.descriptor_map[0]?.format;

		if (format === "vc+sd-jwt") {
			return this.verifySdJwtPresentation(vp_token, pending, issuerPublicKey);
		}

		if (format === "mso_mdoc") {
			return this.verifyMdocPresentation(vp_token, pending, issuerPublicKey);
		}

		throw new ProtocolError(
			ErrorCodes.OPENID4VP_FAILED,
			`Unsupported presentation format: ${format}`,
			`The credential format "${format}" is not supported for verification.`,
		);
	}

	// === Presentation Definition Builder ===

	static buildPresentationDefinition(
		params: PresentationRequestParams,
	): PresentationDefinition {
		return buildPresentationDefinition(params);
	}

	// === Internal ===

	private async verifySdJwtPresentation(
		vpToken: string,
		pending: PendingRequest,
		issuerPublicKey?: Uint8Array,
	): Promise<VerifiedPresentation> {
		// Resolve issuer public key if not provided
		const pubKey =
			issuerPublicKey ?? (await this.resolveIssuerKeyFromSdJwt(vpToken));

		if (!pubKey) {
			return {
				valid: false,
				format: "sd-jwt-vc",
				claims: {},
				issuer: "",
				issuedAt: new Date(),
				errors: ["Could not resolve issuer public key"],
				requestedClaimsPresent: false,
			};
		}

		const result = await verifySdJwtVc(vpToken, pubKey);

		if (!result.valid) {
			return {
				valid: false,
				format: "sd-jwt-vc",
				claims: {},
				issuer: result.issuer,
				issuedAt: result.issuedAt,
				errors: result.errors,
				requestedClaimsPresent: false,
			};
		}

		// Check expiry
		if (result.expiresAt && result.expiresAt < new Date()) {
			return {
				valid: false,
				format: "sd-jwt-vc",
				claims: result.claims,
				issuer: result.issuer,
				issuedAt: result.issuedAt,
				expiresAt: result.expiresAt,
				errors: ["Credential has expired"],
				requestedClaimsPresent: false,
			};
		}

		// Check trusted issuers
		if (this.config.trustedIssuers && this.config.trustedIssuers.length > 0) {
			if (!this.config.trustedIssuers.includes(result.issuer)) {
				return {
					valid: false,
					format: "sd-jwt-vc",
					claims: result.claims,
					issuer: result.issuer,
					issuedAt: result.issuedAt,
					expiresAt: result.expiresAt,
					errors: [`Issuer ${result.issuer} is not trusted`],
					requestedClaimsPresent: false,
				};
			}
		}

		// Check that all requested claims are present
		const requestedClaimsPresent = pending.params.requiredClaims.every(
			(claim) => claim in result.claims,
		);

		return {
			valid: true,
			format: "sd-jwt-vc",
			claims: result.claims,
			issuer: result.issuer,
			issuedAt: result.issuedAt,
			expiresAt: result.expiresAt,
			requestedClaimsPresent,
		};
	}

	private async verifyMdocPresentation(
		vpToken: string,
		pending: PendingRequest,
		issuerPublicKey?: Uint8Array,
	): Promise<VerifiedPresentation> {
		const mdocBytes = base64urlToUint8Array(vpToken);
		const pubKey = issuerPublicKey;

		if (!pubKey) {
			return {
				valid: false,
				format: "mdoc",
				claims: {},
				issuer: "",
				issuedAt: new Date(),
				errors: ["Issuer public key required for mDoc verification"],
				requestedClaimsPresent: false,
			};
		}

		const result = await verifyMdoc(mdocBytes, pubKey);

		if (!result.valid) {
			return {
				valid: false,
				format: "mdoc",
				claims: {},
				issuer: result.issuer,
				issuedAt: result.issuedAt,
				errors: result.errors,
				requestedClaimsPresent: false,
			};
		}

		// Check expiry
		if (result.expiresAt && result.expiresAt < new Date()) {
			return {
				valid: false,
				format: "mdoc",
				claims: result.claims,
				issuer: result.issuer,
				issuedAt: result.issuedAt,
				expiresAt: result.expiresAt,
				errors: ["Credential has expired"],
				requestedClaimsPresent: false,
			};
		}

		// Check trusted issuers
		if (this.config.trustedIssuers && this.config.trustedIssuers.length > 0) {
			if (!this.config.trustedIssuers.includes(result.issuer)) {
				return {
					valid: false,
					format: "mdoc",
					claims: result.claims,
					issuer: result.issuer,
					issuedAt: result.issuedAt,
					expiresAt: result.expiresAt,
					errors: [`Issuer ${result.issuer} is not trusted`],
					requestedClaimsPresent: false,
				};
			}
		}

		const requestedClaimsPresent = pending.params.requiredClaims.every(
			(claim) => claim in result.claims,
		);

		return {
			valid: true,
			format: "mdoc",
			claims: result.claims,
			issuer: result.issuer,
			issuedAt: result.issuedAt,
			expiresAt: result.expiresAt,
			requestedClaimsPresent,
		};
	}

	private async resolveIssuerKeyFromSdJwt(
		sdJwt: string,
	): Promise<Uint8Array | null> {
		try {
			// Parse JWT to extract issuer DID
			const jwt = sdJwt.split("~")[0]!;
			const payloadB64 = jwt.split(".")[1]!;
			const payload = JSON.parse(
				Buffer.from(
					payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
					"base64",
				).toString(),
			) as { iss?: string };

			if (!payload.iss) return null;

			const resolution = await resolveDID(payload.iss);
			if (!resolution.didDocument?.verificationMethod?.[0]?.publicKeyJwk)
				return null;

			return jwkToPublicKey(
				resolution.didDocument.verificationMethod[0].publicKeyJwk,
			);
		} catch {
			return null;
		}
	}
}

// === Helpers ===

function generateRandomToken(): string {
	return bytesToHex(randomBytes(32));
}

function buildPresentationDefinition(
	params: PresentationRequestParams,
): PresentationDefinition {
	const formatSpec: InputDescriptor["format"] = {};

	if (!params.format || params.format === "sd-jwt-vc") {
		formatSpec["vc+sd-jwt"] = { alg: ["ES256"] };
	}
	if (!params.format || params.format === "mdoc") {
		formatSpec.mso_mdoc = { alg: ["ES256"] };
	}

	const fields = params.requiredClaims.map((claim) => ({
		path: [`$.${claim}`, `$.credentialSubject.${claim}`],
	}));

	return {
		id: generateRandomToken().slice(0, 16),
		input_descriptors: [
			{
				id: params.credentialType,
				name: params.credentialType,
				purpose: params.purpose ?? `Verification of ${params.credentialType}`,
				format: formatSpec,
				constraints: { fields },
			},
		],
	};
}
