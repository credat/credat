import type { TrustChainInfo } from "../types";

export interface TrustListProvider {
	name: string;
	isIssuerTrusted(issuerDid: string): Promise<boolean>;
	listTrustedIssuers(): Promise<string[]>;
}

// Static EU trust list — known EUDIW PID issuers from pilot programs
// These will be updated as the EU trust framework evolves
const EU_TRUSTED_ISSUERS: ReadonlyMap<string, TrustedIssuerInfo> = new Map([
	// German EUDIW pilot (Bundesdruckerei)
	[
		"did:web:pid-issuer.bundesdruckerei.de",
		{ name: "German PID Issuer (Bundesdruckerei)", country: "DE" },
	],
	// French EUDIW pilot (ANTS)
	[
		"did:web:pid.ants.gouv.fr",
		{ name: "French PID Issuer (ANTS)", country: "FR" },
	],
	// Spanish EUDIW pilot
	["did:web:pid.redsara.es", { name: "Spanish PID Issuer", country: "ES" }],
	// Italian EUDIW pilot
	["did:web:pid.ipzs.it", { name: "Italian PID Issuer (IPZS)", country: "IT" }],
	// EBSI conformance testing
	[
		"did:ebsi:conformance",
		{ name: "EBSI Conformance Test Issuer", country: "EU" },
	],
]);

interface TrustedIssuerInfo {
	name: string;
	country: string;
}

// === Static EU Trust List ===

export class EuTrustList implements TrustListProvider {
	readonly name = "eu-trust-list";

	async isIssuerTrusted(issuerDid: string): Promise<boolean> {
		return EU_TRUSTED_ISSUERS.has(issuerDid);
	}

	async listTrustedIssuers(): Promise<string[]> {
		return [...EU_TRUSTED_ISSUERS.keys()];
	}

	getIssuerInfo(issuerDid: string): TrustedIssuerInfo | undefined {
		return EU_TRUSTED_ISSUERS.get(issuerDid);
	}
}

// === Custom Trust List ===

export class CustomTrustList implements TrustListProvider {
	readonly name: string;
	private trustedIssuers: Set<string>;

	constructor(name: string, issuers: string[]) {
		this.name = name;
		this.trustedIssuers = new Set(issuers);
	}

	async isIssuerTrusted(issuerDid: string): Promise<boolean> {
		return this.trustedIssuers.has(issuerDid);
	}

	async listTrustedIssuers(): Promise<string[]> {
		return [...this.trustedIssuers];
	}

	addIssuer(did: string): void {
		this.trustedIssuers.add(did);
	}

	removeIssuer(did: string): boolean {
		return this.trustedIssuers.delete(did);
	}
}

// === Verification Helper ===

export async function isIssuerTrusted(
	issuerDid: string,
	trustList: TrustListProvider | "eu" | "custom",
	customIssuers?: string[],
): Promise<TrustChainInfo> {
	let provider: TrustListProvider;

	if (trustList === "eu") {
		provider = new EuTrustList();
	} else if (trustList === "custom") {
		provider = new CustomTrustList("custom", customIssuers ?? []);
	} else {
		provider = trustList;
	}

	const trusted = await provider.isIssuerTrusted(issuerDid);

	return {
		issuerTrusted: trusted,
		trustListSource: provider.name,
		verifiedAt: new Date(),
	};
}
