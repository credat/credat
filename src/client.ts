import { validateConfig } from "./config";
import { createSdJwtVc, verifySdJwtVc } from "./credentials/formats/sd-jwt-vc";
import {
	createStatusList as createStatusListCore,
	createStatusListCredential,
	isRevoked as isRevokedCore,
	setRevocationStatus,
} from "./credentials/status-list";
import {
	base64urlToUint8Array,
	generateKeyPair,
	jwkToPublicKey,
	uint8ArrayToBase64url,
} from "./crypto/keys";
import { createDidKey } from "./did/methods/key";
import { createDidWeb } from "./did/methods/web";
import { resolveDID } from "./did/resolver";
import { CredatError, CredentialError, ErrorCodes } from "./errors";
import { MemoryStorage } from "./storage";
import type { StorageAdapter } from "./storage/types";
import type {
	ClientConfig,
	CredatClient,
	DIDCreateOptions,
	DIDResolutionResult,
	IssuanceRequest,
	IssuedCredential,
	RevocationStatus,
	StatusListData,
	VerificationError,
	VerificationRequest,
	VerificationResult,
} from "./types";

const STATUS_LIST_COLLECTION = "status-lists";

interface StoredStatusList {
	bitstring: string; // base64url-encoded raw bitstring (not gzipped)
	issuer: string;
	id: string;
	size: number;
}

export function createClient(config: ClientConfig): CredatClient {
	const validated = validateConfig(config);

	if (validated.mode === "cloud") {
		throw new CredatError(
			ErrorCodes.INVALID_CONFIG,
			"Cloud mode is not yet available",
			'Cloud mode is coming soon. Use local mode for now: createClient({ mode: "local" })',
		);
	}

	return createLocalClient(validated);
}

function createLocalClient(config: ClientConfig): CredatClient {
	const keyPair = generateKeyPair("ES256");
	const issuerDid = createDidKey(keyPair.publicKey, "ES256");
	const storage: StorageAdapter = config.storage ?? new MemoryStorage();

	return {
		credentials: createCredentialsModule(
			keyPair.privateKey,
			keyPair.publicKey,
			issuerDid,
		),
		did: createDIDModule(),
		statusList: createStatusListModule(storage, issuerDid, keyPair.privateKey),
	};
}

// === Credentials Module ===

function createCredentialsModule(
	privateKey: Uint8Array,
	publicKey: Uint8Array,
	issuerDid: string,
) {
	return {
		async issue(request: IssuanceRequest): Promise<IssuedCredential> {
			const credentialId = `urn:uuid:${crypto.randomUUID()}`;
			const now = new Date();

			const raw = await createSdJwtVc({
				issuerPrivateKey: privateKey,
				issuerPublicKey: publicKey,
				issuerDid,
				type: request.type,
				claims: request.claims,
				selectiveDisclosure: request.selectiveDisclosure ?? [],
				holderDid: request.holder,
				expiresAt: request.expiresAt,
				statusListUrl: request.statusListEntry?.statusListUrl,
				statusListIndex: request.statusListEntry?.statusListIndex,
			});

			return {
				id: credentialId,
				format: "sd-jwt-vc",
				raw,
				type: request.type,
				issuer: issuerDid,
				holder: request.holder,
				issuedAt: now,
				expiresAt: request.expiresAt,
				claims: request.claims,
				statusListEntry: request.statusListEntry,
			};
		},

		async verify(request: VerificationRequest): Promise<VerificationResult> {
			return verifySdJwtCredential(request, publicKey);
		},
	};
}

async function verifySdJwtCredential(
	request: VerificationRequest,
	fallbackPublicKey: Uint8Array,
): Promise<VerificationResult> {
	const issuerPublicKey =
		(await resolveIssuerKeyFromSdJwt(request.credential)) ?? fallbackPublicKey;

	const result = await verifySdJwtVc(request.credential, issuerPublicKey);

	const errors: VerificationError[] = [];

	if (!result.valid && result.errors) {
		for (const e of result.errors) {
			errors.push({ code: ErrorCodes.SIGNATURE_INVALID, message: e });
		}
	}

	if (result.valid && result.expiresAt && result.expiresAt < new Date()) {
		errors.push({
			code: ErrorCodes.EXPIRED,
			message: "Credential has expired",
		});
	}

	if (request.requiredClaims) {
		const missing = request.requiredClaims.filter((c) => !(c in result.claims));
		if (missing.length > 0) {
			errors.push({
				code: ErrorCodes.MISSING_REQUIRED_CLAIMS,
				message: `Missing required claims: ${missing.join(", ")}`,
			});
		}
	}


	// Check revocation
	let revocationStatus: RevocationStatus | undefined;
	if (request.checkRevocation) {
		if (result.statusListEntry && request.statusList) {
			const revoked = isRevokedCore(
				request.statusList,
				result.statusListEntry.statusListIndex,
			);
			if (revoked) {
				revocationStatus = "revoked";
				errors.push({
					code: ErrorCodes.REVOKED,
					message: "Credential has been revoked",
				});
			} else {
				revocationStatus = "valid";
			}
		} else {
			revocationStatus = "unknown";
		}
	}

	return {
		valid: result.valid && errors.length === 0,
		claims: result.claims,
		issuer: result.issuer,
		format: "sd-jwt-vc",
		issuedAt: result.issuedAt,
		expiresAt: result.expiresAt,
		errors: errors.length > 0 ? errors : undefined,
		revocationStatus,
	};
}

async function resolveIssuerKeyFromSdJwt(
	sdJwt: string,
): Promise<Uint8Array | null> {
	try {
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
		const jwk = resolution.didDocument?.verificationMethod?.[0]?.publicKeyJwk;
		if (!jwk) return null;

		return jwkToPublicKey(jwk);
	} catch {
		return null;
	}
}

// === DID Module ===

function createDIDModule() {
	return {
		async create(options: DIDCreateOptions): Promise<string> {
			switch (options.method) {
				case "key": {
					const kp = generateKeyPair("ES256");
					return createDidKey(kp.publicKey, "ES256");
				}
				case "web": {
					if (!options.domain) {
						throw new CredatError(
							ErrorCodes.INVALID_CONFIG,
							"Domain is required for did:web",
							'Provide a domain: client.did.create({ method: "web", domain: "example.com" })',
						);
					}
					return createDidWeb(options.domain);
				}
				default:
					throw new CredatError(
						ErrorCodes.INVALID_CONFIG,
						`DID method "${options.method}" cannot be created locally. Supported: key, web.`,
					);
			}
		},

		resolve(did: string): Promise<DIDResolutionResult> {
			return resolveDID(did);
		},
	};
}

// === Status List Module ===

function createStatusListModule(
	storage: StorageAdapter,
	issuerDid: string,
	issuerPrivateKey: Uint8Array,
) {
	async function loadList(listId: string): Promise<StatusListData | null> {
		const stored = await storage.get<StoredStatusList>(
			STATUS_LIST_COLLECTION,
			listId,
		);
		if (!stored) return null;
		return {
			bitstring: base64urlToUint8Array(stored.bitstring),
			issuer: stored.issuer,
			id: stored.id,
			size: stored.size,
		};
	}

	async function saveList(list: StatusListData): Promise<void> {
		const stored: StoredStatusList = {
			bitstring: uint8ArrayToBase64url(list.bitstring),
			issuer: list.issuer,
			id: list.id,
			size: list.size,
		};
		await storage.set(STATUS_LIST_COLLECTION, list.id, stored);
	}

	return {
		async create(options: {
			id: string;
			url: string;
			size?: number;
		}): Promise<StatusListData> {
			const list = createStatusListCore({
				id: options.id,
				issuer: issuerDid,
				url: options.url,
				size: options.size,
			});
			await saveList(list);
			return list;
		},

		async revoke(listId: string, index: number): Promise<void> {
			const list = await loadList(listId);
			if (!list) {
				throw new CredentialError(
					ErrorCodes.STATUS_LIST_INVALID,
					`Status list "${listId}" not found`,
				);
			}
			setRevocationStatus(list, index, true);
			await saveList(list);
		},

		async unrevoke(listId: string, index: number): Promise<void> {
			const list = await loadList(listId);
			if (!list) {
				throw new CredentialError(
					ErrorCodes.STATUS_LIST_INVALID,
					`Status list "${listId}" not found`,
				);
			}
			setRevocationStatus(list, index, false);
			await saveList(list);
		},

		async isRevoked(listId: string, index: number): Promise<boolean> {
			const list = await loadList(listId);
			if (!list) {
				throw new CredentialError(
					ErrorCodes.STATUS_LIST_INVALID,
					`Status list "${listId}" not found`,
				);
			}
			return isRevokedCore(list, index);
		},

		async get(listId: string): Promise<StatusListData | null> {
			return loadList(listId);
		},

		async export(listId: string): Promise<string> {
			const list = await loadList(listId);
			if (!list) {
				throw new CredentialError(
					ErrorCodes.STATUS_LIST_INVALID,
					`Status list "${listId}" not found`,
				);
			}
			return createStatusListCredential({
				list,
				issuerPrivateKey,
				url: `${listId}`,
			});
		},
	};
}

