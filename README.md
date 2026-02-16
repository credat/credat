<p align="center">
  <a href="https://credat.io">
    <img alt="Credat" src="https://raw.githubusercontent.com/credat/credat/develop/logo.png" width="120" />
  </a>
</p>

<h1 align="center">credat</h1>

<p align="center">
  <strong>The AI-native TypeScript SDK for eIDAS 2.0 verifiable credentials.</strong>
  <br />
  Issue and verify EU Digital Identity Wallet credentials in 10 lines of code.
</p>

<p align="center">
  <a href="https://credat.io/docs">Docs</a>
  &middot;
  <a href="https://github.com/credat/credat/tree/develop/examples">Examples</a>
  &middot;
  <a href="https://discord.gg/credat">Discord</a>
  &middot;
  <a href="https://x.com/credatio">Twitter</a>
</p>

<div align="center">

[![npm version](https://img.shields.io/npm/v/credat?color=4f46e5&label=npm)](https://www.npmjs.com/package/credat)
[![license](https://img.shields.io/github/license/credat/credat?color=4f46e5)](./LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/credat/credat/ci.yml?branch=develop&label=tests)](https://github.com/credat/credat/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-4f46e5)](https://www.typescriptlang.org/)

</div>

---

Credat is a TypeScript SDK that makes eIDAS 2.0 credential operations dead simple. Describe your credential schema in plain English, get type-safe code. No SSI knowledge required.

**~12KB gzipped** &middot; **3 audited dependencies** &middot; **Zero config local mode** &middot; **Node.js 20+**

## Quick Start

```bash
npm install credat
```

```typescript
import { createClient } from 'credat'

const client = createClient({ mode: 'local' })

// Issue a verifiable credential
const credential = await client.credentials.issue({
  type: 'KYCVerification',
  claims: {
    givenName: 'Alice',
    familyName: 'Dupont',
    dateOfBirth: '1990-01-15',
    nationality: 'FR',
  },
  format: 'sd-jwt-vc',
  selectiveDisclosure: ['dateOfBirth'],
})

// Verify it
const result = await client.credentials.verify({
  credential: credential.raw,
  requiredClaims: ['givenName', 'familyName'],
})

console.log(result.valid)   // true
console.log(result.claims)  // { givenName: 'Alice', familyName: 'Dupont', ... }
```

That's it. No DID configuration, no key management, no protocol knowledge.

## AI-Powered Schema Generation

Credat is the first SSI SDK with AI built in. Generate eIDAS 2.0 compliant credential schemas from natural language:

```typescript
const client = createClient({
  mode: 'local',
  ai: { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
})

// Describe what you need in plain English
const schema = await client.ai.generateSchema(
  'KYC identity verification for French banking customers under eIDAS 2.0'
)

console.log(schema.type)              // 'KYCIdentityVerification'
console.log(schema.claims)            // { givenName, familyName, birthDate, ... }
console.log(schema.eidasCompliance)   // { compliant: true, warnings: [...] }
console.log(schema.confidence)        // 0.95
```

### AI Error Explainer

Get human-readable explanations instead of cryptic error codes:

```typescript
const result = await client.credentials.verify({ credential: raw })

if (!result.valid) {
  const explanation = await client.ai.explainError(result.errors[0])
  // "Your credential is missing the assurance_level claim required for
  //  eIDAS Level of Assurance High. Add it to your issuance request."
}
```

### Test Fixture Generation

Generate realistic GDPR-safe mock credentials for testing:

```typescript
const fixtures = await client.ai.generateTestFixtures(schema, { count: 10 })
// Returns 10 real signed credentials with fake European identity data
```

## Features

| Feature | Description |
|---------|-------------|
| **SD-JWT VC** | Selective Disclosure JWT Verifiable Credentials (draft-14) |
| **mDoc** | ISO 18013-5 mobile documents with COSE_Sign1 signing |
| **OpenID4VCI** | Credential issuance via pre-authorized code flow |
| **OpenID4VP** | Credential verification via authorization request/response |
| **DID Resolution** | `did:key`, `did:web`, `did:ebsi` — create and resolve |
| **EU Trust Lists** | Built-in EUDIW pilot issuer verification (DE, FR, ES, IT) |
| **AI Schema Gen** | Natural language to typed credential schemas |
| **AI Error Explain** | Human-readable verification error messages |
| **AI Test Fixtures** | Realistic mock credential generation |
| **Local Mode** | Zero-config development with in-memory storage |
| **Type-Safe** | Full TypeScript strict mode with exported types |
| **Dual Build** | ESM + CommonJS output, tree-shakeable |

## Credential Formats

### SD-JWT VC (Selective Disclosure)

The preferred format for eIDAS 2.0 attestations. Holders choose which claims to reveal:

```typescript
// Issue with selective disclosure
const credential = await client.credentials.issue({
  type: 'IdentityCredential',
  claims: {
    givenName: 'Marie',
    familyName: 'Leclerc',
    dateOfBirth: '1985-03-22',
    nationality: 'FR',
    assuranceLevel: 'high',
  },
  format: 'sd-jwt-vc',
  selectiveDisclosure: ['dateOfBirth', 'nationality'],
})

// Verify — only non-SD claims are guaranteed visible
const result = await client.credentials.verify({
  credential: credential.raw,
  requiredClaims: ['givenName', 'assuranceLevel'],
  trustList: 'eu',
})
```

### mDoc (ISO 18013-5)

The standard for mobile identity documents like mobile driving licenses:

```typescript
const mDL = await client.credentials.issue({
  type: 'mDL',
  claims: {
    givenName: 'Pierre',
    familyName: 'Dubois',
    dateOfBirth: '1992-07-14',
    drivingCategory: 'B',
    issuingCountry: 'FR',
  },
  format: 'mdoc',
})
```

## DID Operations

```typescript
// Create identities
const did = await client.did.create({ method: 'key' })
// → did:key:zDnae...

const webDid = await client.did.create({ method: 'web', domain: 'example.com' })
// → did:web:example.com

// Resolve any DID
const doc = await client.did.resolve('did:web:pid-issuer.bundesdruckerei.de')
console.log(doc.didDocument.verificationMethod)
```

## Trust Verification

Verify credentials against the EU trust framework:

```typescript
const result = await client.credentials.verify({
  credential: presentedCredential,
  requiredClaims: ['givenName', 'familyName'],
  trustList: 'eu', // Check against EUDIW pilot issuers
})

if (result.trustChain?.issuerTrusted) {
  console.log(`Trusted by: ${result.trustChain.trustListSource}`)
}
```

Built-in trusted issuers from EUDIW pilot programs:

| Country | Issuer | DID |
|---------|--------|-----|
| Germany | Bundesdruckerei | `did:web:pid-issuer.bundesdruckerei.de` |
| France | ANTS | `did:web:pid.ants.gouv.fr` |
| Spain | RedesSARA | `did:web:pid.redsara.es` |
| Italy | IPZS | `did:web:pid.ipzs.it` |
| EU | EBSI Conformance | `did:ebsi:conformance` |

## Advanced Usage

For developers who need full protocol control, all internal modules are exported:

```typescript
import {
  // Low-level credential operations
  createSdJwtVc,
  verifySdJwtVc,
  presentSdJwtVc,
  createMdoc,
  verifyMdoc,

  // Protocol classes (OpenID4VCI / OpenID4VP)
  CredentialIssuer,
  CredentialVerifier,

  // DID operations
  createDidKey,
  createDidWeb,
  resolveDID,

  // Crypto primitives
  generateKeyPair,
  publicKeyToJwk,

  // Trust & Storage
  EuTrustList,
  CustomTrustList,
  MemoryStorage,
  LocalKeyManager,
} from 'credat'
```

### OpenID4VCI Issuance Flow

```typescript
import { CredentialIssuer, generateKeyPair, createDidKey } from 'credat'

const keyPair = generateKeyPair('ES256')
const issuerDid = createDidKey(keyPair.publicKey, 'ES256')

const issuer = new CredentialIssuer({
  issuerUrl: 'https://issuer.example.com',
  issuerDid,
  signingKeyId: `${issuerDid}#key-1`,
  privateKey: keyPair.privateKey,
  publicKey: keyPair.publicKey,
})

// 1. Create offer
const { offer, offerUri } = issuer.createOffer({
  credentialType: 'KYCVerification',
  claims: { givenName: 'Alice', familyName: 'Dupont' },
})

// 2. Exchange pre-authorized code for token
const code = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code']
const tokenResponse = issuer.exchangePreAuthorizedCode(code)

// 3. Issue credential
const { credential } = await issuer.issueCredential(tokenResponse.access_token)
```

## Configuration

```typescript
import { createClient } from 'credat'

const client = createClient({
  mode: 'local',       // 'local' for development, 'cloud' coming soon
  ai: {
    provider: 'anthropic',           // 'anthropic' | 'openai' | 'custom'
    apiKey: process.env.AI_API_KEY,  // Your LLM API key
    model: 'claude-sonnet-4-5-20250929', // Optional: override default model
  },
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'local' \| 'cloud'` | — | `local` for dev, `cloud` for production (coming soon) |
| `apiKey` | `string` | — | API key for cloud mode |
| `ai.provider` | `'anthropic' \| 'openai' \| 'custom'` | — | LLM provider for AI features |
| `ai.apiKey` | `string` | — | LLM API key |
| `ai.model` | `string` | Provider default | Override the default model |
| `ai.baseUrl` | `string` | Provider default | Custom API endpoint (for `custom` provider) |

## Why Credat?

### vs Credo-TS

Credo is a powerful multi-package agent framework. Credat is a single `npm install` away from your first credential. No agent configuration, no transport setup, no SSI expertise required.

### vs Walt.id

Walt.id targets enterprise buyers at ~$2,500/mo. Credat is open source (Apache 2.0), free for local development, and built for individual developers and startups.

### vs Building From Scratch

The eIDAS 2.0 stack spans SD-JWT VC, mDoc, OpenID4VCI, OpenID4VP, COSE, CBOR, multiple DID methods, and EU trust lists. Credat implements all of this in one package with ~12KB overhead.

| | Credat | Credo-TS | Walt.id | DIY |
|---|:---:|:---:|:---:|:---:|
| Single package | &check; | &cross; | &cross; | — |
| AI features | &check; | &cross; | &cross; | &cross; |
| eIDAS-first | &check; | &cross; | &check; | — |
| Open source | &check; | &check; | Partial | — |
| Zero-config dev | &check; | &cross; | &cross; | — |
| Time to first credential | ~5 min | ~2 hours | ~1 hour | ~2 weeks |

## eIDAS 2.0 Context

The [EU Digital Identity Wallet regulation](https://digital-strategy.ec.europa.eu/en/policies/eidas-regulation) requires all EU member states to offer citizens a digital identity wallet by **December 2027**. Private sector companies (banks, telecoms, healthcare) must accept these wallets.

Credat implements the technical stack specified in the [Architecture Reference Framework (ARF)](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework):

- **Credential formats**: SD-JWT VC + mDoc (both mandated)
- **Exchange protocols**: OpenID4VCI + OpenID4VP (both mandated)
- **DID methods**: did:key, did:web, did:ebsi (EU infrastructure)
- **Trust framework**: EU trust list verification

## Specifications

| Specification | Version | Status |
|---------------|---------|--------|
| SD-JWT VC | draft-14 | Implemented |
| ISO 18013-5 (mDoc) | 2021 | Implemented |
| OpenID4VCI | draft-14 | Implemented |
| OpenID4VP | draft-21 | Implemented |
| did:key | W3C CCG | Implemented |
| did:web | W3C CCG | Implemented |
| did:ebsi | EBSI v5 | Implemented |
| COSE (RFC 9052) | — | Implemented |

## Contributing

We welcome contributions. Here's how to get started:

```bash
git clone https://github.com/credat/credat.git
cd credat
npm install
npm test        # Run 117 tests
npm run build   # ESM + CJS + .d.ts
```

1. Fork the repo and create a feature branch
2. Make changes and add tests
3. Ensure `npm test` and `npm run typecheck` pass
4. Submit a pull request

We follow [conventional commits](https://www.conventionalcommits.org/).

## Roadmap

- [x] Core SDK (crypto, DID, SD-JWT VC, mDoc)
- [x] OpenID4VCI + OpenID4VP protocols
- [x] EU trust list verification
- [x] `createClient()` unified facade
- [x] AI schema generation, error explainer, test fixtures
- [ ] Cloud mode (managed keys, trust list sync, analytics)
- [ ] CLI tool
- [ ] Revocation registry
- [ ] SQLite storage adapter
- [ ] React Native support
- [ ] Holder wallet SDK

## License

[Apache 2.0](./LICENSE) &mdash; free for commercial use.

---

<p align="center">
  <a href="https://credat.io">Website</a>
  &middot;
  <a href="https://x.com/credatio">Twitter</a>
  &middot;
  <a href="https://discord.gg/credat">Discord</a>
  &middot;
  <a href="https://github.com/credat/credat">GitHub</a>
</p>

<p align="center">
  Built by <a href="https://maximemansiet.fr">Maxime Mansiet</a> in Bordeaux, France.
</p>
