# Changelog

## [0.4.0-alpha.1](https://github.com/credat/credat/compare/v0.3.0-alpha.1...v0.4.0-alpha.1) (2026-05-20)


### ⚠ BREAKING CHANGES

* encodeStatusList, decodeStatusList, createStatusListCredential, and verifyStatusListCredential are now async (return Promises). This was necessary to use the Web Standard Compression Streams API which is async.

### Features

* add DIDCache for did:web resolution caching ([c96eb32](https://github.com/credat/credat/commit/c96eb3286567445d1502438576de7a37fde4c9a8)), closes [#18](https://github.com/credat/credat/issues/18)
* add MCP server authentication example ([33f216d](https://github.com/credat/credat/commit/33f216dc8cf232c73204d81cea09e5a22255bd15)), closes [#19](https://github.com/credat/credat/issues/19)
* add OpenAI Agents SDK integration example ([6ba2570](https://github.com/credat/credat/commit/6ba2570cd979977008390cc2235e89b2dfc6e833)), closes [#21](https://github.com/credat/credat/issues/21)
* support browser and edge runtimes ([c8cddcc](https://github.com/credat/credat/commit/c8cddcc3fd575da89338c19efa68a52fd32abd3d)), closes [#20](https://github.com/credat/credat/issues/20)


### Bug Fixes

* add SECURITY.md and sync VERSION constant ([2a81e1b](https://github.com/credat/credat/commit/2a81e1b6268d110a302c14eb616a3f2809f4ceaf)), closes [#17](https://github.com/credat/credat/issues/17)

## [0.3.0-alpha.1](https://github.com/credat/credat/compare/v0.2.2-alpha.1...v0.3.0-alpha.1) (2026-03-19)


### ⚠ BREAKING CHANGES

* Package name changed from `credat` to `@credat/sdk`. Update imports: `import { ... } from '@credat/sdk'` SQLite subpath: `import { SqliteStorage } from '@credat/sdk/sqlite'`

### Features

* rename package from credat to @credat/sdk ([0541ce7](https://github.com/credat/credat/commit/0541ce75a96160f4b05ed7b74e1788a11ce5f93b))


### Bug Fixes

* **ci:** always publish npm packages with latest tag ([ff3fdae](https://github.com/credat/credat/commit/ff3fdaecb9e11c700a49b1839630bee8b2baf561))

## [0.2.2-alpha.1](https://github.com/credat/credat/compare/v0.2.1-alpha.1...v0.2.2-alpha.1) (2026-03-19)


### Features

* add delegation chains, constraint validation, status list storage, and hardened verification ([5a2795e](https://github.com/credat/credat/commit/5a2795eabf69a63c35c3f16750379d21548d1326))


### Bug Fixes

* correct Twitter handle to [@credat](https://github.com/credat)_dev ([21303dc](https://github.com/credat/credat/commit/21303dc60942fb0a44103decb9ff29bd9f698bde))
* **deps:** update rollup to 4.59.0 to fix arbitrary file write vulnerability ([217d5a8](https://github.com/credat/credat/commit/217d5a80f59badff1ead48d90f15c1d83eb31a60))

## [0.2.1-alpha.1](https://github.com/credat/credat/compare/v0.2.0-alpha.1...v0.2.1-alpha.1) (2026-02-25)


### Features

* add agent identity, delegation, and handshake types ([b42727b](https://github.com/credat/credat/commit/b42727b0502dd80a11f4b202b50ac7d4d3fde657))
* add agent-to-agent trust example ([91a328a](https://github.com/credat/credat/commit/91a328a7b856d452ccd66e1fad0969a3a384916a))
* add basic trust list verification ([c06b27a](https://github.com/credat/credat/commit/c06b27a2043697e95b68ab2766e8798a0e37ca47))
* add basic-agent example ([e33b533](https://github.com/credat/credat/commit/e33b53352b1a73f87852e16801e6afeeb24c5d6d))
* add CI/CD workflows and release automation ([#1](https://github.com/credat/credat/issues/1)) ([e708e4e](https://github.com/credat/credat/commit/e708e4e4f051983f15457c788a280e01bd826c49))
* add core types, config, and error classes ([9eead46](https://github.com/credat/credat/commit/9eead46eff94aae3650d67c8d97442fae5124967))
* add createClient() facade and AI-native schema generation ([1604a41](https://github.com/credat/credat/commit/1604a41bc0d48dbbef80d0d83e3fcf0c9fa5cfb9))
* add crypto utilities (key generation, signing, verification) ([e6c4fb3](https://github.com/credat/credat/commit/e6c4fb358598eb305e79bb335a8a74a8b520a453))
* add did:key creation and resolution ([25406ef](https://github.com/credat/credat/commit/25406efcdfee14f61a2de28783521c880cb6a997))
* add did:web and did:ebsi resolution ([f78cf7c](https://github.com/credat/credat/commit/f78cf7c4565477418b1899ed940224127ee0485b))
* add local key management with storage adapter ([c5bec15](https://github.com/credat/credat/commit/c5bec1558d3de57ccb668c7683615e290fdce561))
* add mDoc (ISO 18013-5) CBOR encoding and verification ([56acb10](https://github.com/credat/credat/commit/56acb104338cf964ecc06704aeac0cb139da5098))
* add OpenID4VCI credential issuance protocol ([f154739](https://github.com/credat/credat/commit/f15473987613564dddbe14100af92aaba63c5933))
* add OpenID4VP credential verification protocol ([681bd9e](https://github.com/credat/credat/commit/681bd9e68024df05ae9dd8ed473d5ac0d8b4cc34))
* add pluggable storage with in-memory adapter ([5d1863b](https://github.com/credat/credat/commit/5d1863bfb3f24311bc2225f981cbb9491de46426))
* add SD-JWT VC encoding, decoding, and selective disclosure ([a044359](https://github.com/credat/credat/commit/a0443590b02cb64c0db1d617024791c21224b41a))
* implement createAgent with did:web identity ([721c75a](https://github.com/credat/credat/commit/721c75ae007b8ff170d5ecc76cc4357a6eb36d7a))
* implement createChallenge ([52e52df](https://github.com/credat/credat/commit/52e52df17c9c64f1d2dd948701e0a34cde74d2c9))
* implement delegate — issue Delegation VC ([e58c102](https://github.com/credat/credat/commit/e58c102da25df79a3161585395a26edf9ffb0f92))
* implement loadAgent from storage ([c5bbc71](https://github.com/credat/credat/commit/c5bbc71bb5abc7e4f4f0379633ed0e9a10d77880))
* implement presentCredentials ([b31298f](https://github.com/credat/credat/commit/b31298f3179eb999cf16f5d4ac122b7a771f47f5))
* implement scope helpers ([c605a9c](https://github.com/credat/credat/commit/c605a9c5083ba76afcac8b79d06f4f466e8b38a3))
* implement verifyDelegation ([f2087bc](https://github.com/credat/credat/commit/f2087bcae772cba7239f399e98408b8519f07ee5))
* implement verifyPresentation — 3-message handshake ([3bb028b](https://github.com/credat/credat/commit/3bb028b1f9e26a9cfbe834843955539a94cbd2f3))
* new public API for agent identity ([74c64e2](https://github.com/credat/credat/commit/74c64e208e0d5682b99c7d782383d1722de604f5))
* SQLite storage adapter + credential revocation (Status List 2021) ([#2](https://github.com/credat/credat/issues/2)) ([5a12daa](https://github.com/credat/credat/commit/5a12daaffa3bcef162aa0d583480cd5c9dcca98c))


### Bug Fixes

* add push trigger to CI and fix README badges ([5be49ee](https://github.com/credat/credat/commit/5be49ee96c855acb249c3123129f1fae2adc7d94))
* harden error handling and validation across verification pipeline ([b4f07bf](https://github.com/credat/credat/commit/b4f07bff5fdc75a5e77a24038d9efe7834075873))
* normalize cbor-x input in verifyMdoc for Buffer/Uint8Array compat ([240c0eb](https://github.com/credat/credat/commit/240c0eb9359e079d7461cc96a4779aad5e864d51))
* set release-please target branch to main ([851e43a](https://github.com/credat/credat/commit/851e43a9b8ba700a64588855d4f2d459e47269c7))
* use absolute URL for logo on npm, bump to alpha.1 ([786d969](https://github.com/credat/credat/commit/786d969cc160a4be947375d904afb983166699c6))

## [0.1.1-alpha.1](https://github.com/credat/credat/compare/v0.1.0-alpha.1...v0.1.1-alpha.1) (2026-02-16)


### Features

* add basic trust list verification ([c06b27a](https://github.com/credat/credat/commit/c06b27a2043697e95b68ab2766e8798a0e37ca47))
* add CI/CD workflows and release automation ([#1](https://github.com/credat/credat/issues/1)) ([e708e4e](https://github.com/credat/credat/commit/e708e4e4f051983f15457c788a280e01bd826c49))
* add core types, config, and error classes ([9eead46](https://github.com/credat/credat/commit/9eead46eff94aae3650d67c8d97442fae5124967))
* add createClient() facade and AI-native schema generation ([1604a41](https://github.com/credat/credat/commit/1604a41bc0d48dbbef80d0d83e3fcf0c9fa5cfb9))
* add crypto utilities (key generation, signing, verification) ([e6c4fb3](https://github.com/credat/credat/commit/e6c4fb358598eb305e79bb335a8a74a8b520a453))
* add did:key creation and resolution ([25406ef](https://github.com/credat/credat/commit/25406efcdfee14f61a2de28783521c880cb6a997))
* add did:web and did:ebsi resolution ([f78cf7c](https://github.com/credat/credat/commit/f78cf7c4565477418b1899ed940224127ee0485b))
* add local key management with storage adapter ([c5bec15](https://github.com/credat/credat/commit/c5bec1558d3de57ccb668c7683615e290fdce561))
* add mDoc (ISO 18013-5) CBOR encoding and verification ([56acb10](https://github.com/credat/credat/commit/56acb104338cf964ecc06704aeac0cb139da5098))
* add OpenID4VCI credential issuance protocol ([f154739](https://github.com/credat/credat/commit/f15473987613564dddbe14100af92aaba63c5933))
* add OpenID4VP credential verification protocol ([681bd9e](https://github.com/credat/credat/commit/681bd9e68024df05ae9dd8ed473d5ac0d8b4cc34))
* add pluggable storage with in-memory adapter ([5d1863b](https://github.com/credat/credat/commit/5d1863bfb3f24311bc2225f981cbb9491de46426))
* add SD-JWT VC encoding, decoding, and selective disclosure ([a044359](https://github.com/credat/credat/commit/a0443590b02cb64c0db1d617024791c21224b41a))
* SQLite storage adapter + credential revocation (Status List 2021) ([#2](https://github.com/credat/credat/issues/2)) ([5a12daa](https://github.com/credat/credat/commit/5a12daaffa3bcef162aa0d583480cd5c9dcca98c))


### Bug Fixes

* add push trigger to CI and fix README badges ([5be49ee](https://github.com/credat/credat/commit/5be49ee96c855acb249c3123129f1fae2adc7d94))
* normalize cbor-x input in verifyMdoc for Buffer/Uint8Array compat ([240c0eb](https://github.com/credat/credat/commit/240c0eb9359e079d7461cc96a4779aad5e864d51))
* set release-please target branch to main ([851e43a](https://github.com/credat/credat/commit/851e43a9b8ba700a64588855d4f2d459e47269c7))
* use absolute URL for logo on npm, bump to alpha.1 ([786d969](https://github.com/credat/credat/commit/786d969cc160a4be947375d904afb983166699c6))
