# Changelog

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
