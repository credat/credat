import type { CredentialClaims, CredentialFormat } from "../../types";

// OpenID4VCI Pre-Authorized Code Flow types
// Ref: OpenID4VCI draft-14

export interface CredentialOfferParams {
	credentialType: string;
	claims: CredentialClaims;
	format?: CredentialFormat;
	selectiveDisclosure?: string[];
	holderDid?: string;
	expiresAt?: Date;
}

export interface CredentialOffer {
	credential_issuer: string;
	credential_configuration_ids: string[];
	grants: {
		"urn:ietf:params:oauth:grant-type:pre-authorized_code": {
			"pre-authorized_code": string;
		};
	};
}

export interface TokenRequest {
	grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code";
	"pre-authorized_code": string;
}

export interface TokenResponse {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	c_nonce?: string;
	c_nonce_expires_in?: number;
}

export interface CredentialRequest {
	format: "vc+sd-jwt";
	credential_identifier?: string;
	proof?: {
		proof_type: "jwt";
		jwt: string;
	};
}

export interface CredentialResponse {
	format: "vc+sd-jwt";
	credential: string; // SD-JWT string
}

export interface IssuerMetadata {
	credential_issuer: string;
	credential_endpoint: string;
	token_endpoint: string;
	credential_configurations_supported: Record<
		string,
		CredentialConfigurationSupported
	>;
}

export interface CredentialConfigurationSupported {
	format: "vc+sd-jwt";
	credential_definition?: {
		type: string[];
		credentialSubject?: Record<
			string,
			{ display?: Array<{ name: string; locale: string }> }
		>;
	};
	scope?: string;
}

// Internal state for pending offers
export interface PendingOffer {
	preAuthorizedCode: string;
	params: CredentialOfferParams;
	createdAt: Date;
	expiresAt: Date;
}

// Internal state for issued tokens
export interface IssuedToken {
	accessToken: string;
	preAuthorizedCode: string;
	params: CredentialOfferParams;
	createdAt: Date;
	expiresAt: Date;
	nonce?: string;
}
