import { describe, expect, it } from "vitest";
import { CustomTrustList, EuTrustList, isIssuerTrusted } from "./trust-list";

describe("EuTrustList", () => {
	const trustList = new EuTrustList();

	it("recognizes known EU issuer as trusted", async () => {
		const result = await trustList.isIssuerTrusted(
			"did:web:pid-issuer.bundesdruckerei.de",
		);
		expect(result).toBe(true);
	});

	it("rejects unknown issuer as untrusted", async () => {
		const result = await trustList.isIssuerTrusted(
			"did:web:unknown-issuer.example.com",
		);
		expect(result).toBe(false);
	});

	it("lists all trusted issuers", async () => {
		const issuers = await trustList.listTrustedIssuers();
		expect(issuers.length).toBeGreaterThan(0);
		expect(issuers).toContain("did:web:pid-issuer.bundesdruckerei.de");
		expect(issuers).toContain("did:web:pid.ants.gouv.fr");
	});

	it("returns issuer info for known issuer", () => {
		const info = trustList.getIssuerInfo("did:web:pid.ants.gouv.fr");
		expect(info).toBeDefined();
		expect(info?.country).toBe("FR");
		expect(info?.name).toContain("French");
	});

	it("returns undefined for unknown issuer info", () => {
		const info = trustList.getIssuerInfo("did:web:unknown.example.com");
		expect(info).toBeUndefined();
	});
});

describe("CustomTrustList", () => {
	it("trusts issuers in the custom list", async () => {
		const trustList = new CustomTrustList("my-org", [
			"did:key:zIssuer1",
			"did:key:zIssuer2",
		]);

		expect(await trustList.isIssuerTrusted("did:key:zIssuer1")).toBe(true);
		expect(await trustList.isIssuerTrusted("did:key:zIssuer2")).toBe(true);
		expect(await trustList.isIssuerTrusted("did:key:zIssuer3")).toBe(false);
	});

	it("returns empty list for empty trust list", async () => {
		const trustList = new CustomTrustList("empty", []);

		expect(await trustList.isIssuerTrusted("did:key:zAny")).toBe(false);
		expect(await trustList.listTrustedIssuers()).toEqual([]);
	});

	it("allows adding and removing issuers", async () => {
		const trustList = new CustomTrustList("dynamic", []);

		trustList.addIssuer("did:key:zNew");
		expect(await trustList.isIssuerTrusted("did:key:zNew")).toBe(true);

		trustList.removeIssuer("did:key:zNew");
		expect(await trustList.isIssuerTrusted("did:key:zNew")).toBe(false);
	});
});

describe("isIssuerTrusted helper", () => {
	it("uses EU trust list when specified", async () => {
		const result = await isIssuerTrusted(
			"did:web:pid-issuer.bundesdruckerei.de",
			"eu",
		);
		expect(result.issuerTrusted).toBe(true);
		expect(result.trustListSource).toBe("eu-trust-list");
		expect(result.verifiedAt).toBeInstanceOf(Date);
	});

	it("uses custom trust list with provided issuers", async () => {
		const result = await isIssuerTrusted("did:key:zMyIssuer", "custom", [
			"did:key:zMyIssuer",
		]);
		expect(result.issuerTrusted).toBe(true);
		expect(result.trustListSource).toBe("custom");
	});

	it("reports untrusted for unknown issuer", async () => {
		const result = await isIssuerTrusted("did:key:zUnknown", "eu");
		expect(result.issuerTrusted).toBe(false);
	});

	it("reports untrusted with empty custom list", async () => {
		const result = await isIssuerTrusted("did:key:zAny", "custom", []);
		expect(result.issuerTrusted).toBe(false);
	});

	it("accepts a TrustListProvider instance directly", async () => {
		const provider = new CustomTrustList("direct", ["did:key:zDirect"]);
		const result = await isIssuerTrusted("did:key:zDirect", provider);
		expect(result.issuerTrusted).toBe(true);
		expect(result.trustListSource).toBe("direct");
	});
});
