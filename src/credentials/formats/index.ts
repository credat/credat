export type { SdJwtVcCreateOptions, SdJwtVcVerifyResult } from "./sd-jwt-vc";
export { createSdJwtVc, selectDisclosures, verifySdJwtVc } from "./sd-jwt-vc";

export type {
	CreateStatusListCredentialOptions,
	CreateStatusListOptions,
	VerifyStatusListCredentialResult,
} from "./status-list";
export {
	createStatusList,
	createStatusListCredential,
	decodeStatusList,
	encodeStatusList,
	isRevoked,
	setRevocationStatus,
	verifyStatusListCredential,
} from "./status-list";
