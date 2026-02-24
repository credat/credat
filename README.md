<p align="center">
  <a href="https://credat.io">
    <img alt="Credat" src="https://raw.githubusercontent.com/credat/credat/develop/logo.png" width="120" />
  </a>
</p>

<h1 align="center">credat</h1>

<p align="center">
  <strong>Trust layer for AI agents.</strong>
  <br />
  Identity, delegation, and mutual verification — in a single package.
</p>

<p align="center">
  <a href="https://github.com/credat/credat/tree/develop/examples">Examples</a>
  &middot;
  <a href="https://github.com/credat/credat">GitHub</a>
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

Agents are everywhere — but how does one agent prove who it is to another? How does an owner limit what their agent can do? Credat solves this with DIDs, Verifiable Credentials, and a simple three-message handshake.

**~28KB bundled** · **2 dependencies** · **Zero config** · **Node.js 22+**

## Quick Start

```bash
npm install credat
```

### 1. Create an agent identity

```typescript
import { createAgent, generateKeyPair, createDidWeb, delegate } from 'credat'

// Owner creates their identity
const ownerKeyPair = generateKeyPair('ES256')
const ownerDid = createDidWeb('alice.example.com')

// Owner creates an agent
const agent = await createAgent({
  domain: 'agents.alice.example.com',
  path: 'assistant',
})

console.log(agent.did) // did:web:agents.alice.example.com:assistant
```

### 2. Delegate scoped permissions

```typescript
const delegation = await delegate({
  agent: agent.did,
  owner: ownerDid,
  ownerKeyPair,
  scopes: ['email:read', 'calendar:write', 'travel:book'],
  constraints: {
    maxTransactionValue: 1000,
    allowedDomains: ['airline.example.com'],
  },
  validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})
```

### 3. Verify via handshake

```typescript
import { createChallenge, presentCredentials, verifyPresentation, hasScope } from 'credat'

// Service challenges the agent
const challenge = createChallenge({ from: 'did:web:airline.example.com' })

// Agent presents its delegation
const presentation = await presentCredentials({
  challenge,
  delegation: delegation.token,
  agent,
})

// Service verifies everything: nonce, signature, delegation chain, scopes
const result = await verifyPresentation(presentation, {
  challenge,
  ownerPublicKey: ownerKeyPair.publicKey,
  agentPublicKey: agent.keyPair.publicKey,
})

console.log(result.valid)                    // true
console.log(result.scopes)                   // ['email:read', 'calendar:write', 'travel:book']
console.log(hasScope(result, 'travel:book')) // true
```

That's it. The agent proved who it is. The service knows what it can do.

## How It Works

```
┌─────────┐                        ┌─────────────┐
│  Owner  │                        │   Service   │
│ (Alice) │                        │ (Airline)   │
└────┬────┘                        └──────┬──────┘
     │                                    │
     │  1. delegate(scopes, constraints)  │
     │ ──────────────────┐                │
     ▼                   │                │
┌─────────┐              │                │
│  Agent  │◄─────────────┘                │
│ (Alice's│                               │
│  Asst.) │   2. challenge (nonce)        │
│         │◄──────────────────────────────│
│         │                               │
│         │   3. presentation (proof+VC)  │
│         │──────────────────────────────►│
│         │                               │
│         │   4. verified ✓ (scopes)      │
│         │◄──────────────────────────────│
└─────────┘                        └──────┘
```

**Step 1 — Delegation:** Owner issues an SD-JWT Verifiable Credential to the agent, encoding scopes and constraints.

**Step 2 — Challenge:** Service sends a random nonce to the agent.

**Step 3 — Presentation:** Agent signs the nonce with its private key and presents the delegation VC.

**Step 4 — Verification:** Service verifies the nonce signature (proves the agent holds the key), the delegation VC signature (proves the owner issued it), and checks scopes/constraints/expiration.

## Features

| Feature | Description |
|---------|-------------|
| **Agent Identity** | Create agent identities with `did:web` and auto-generated DID Documents |
| **Delegation** | Issue scoped delegation credentials (SD-JWT VC) with constraints |
| **Handshake** | Three-message challenge/presentation/verification protocol |
| **Scope Helpers** | `hasScope`, `hasAnyScope`, `hasAllScopes`, `getAllScopes` |
| **Selective Disclosure** | Agents reveal only the scopes needed for each interaction |
| **Revocation** | W3C Status List 2021 for credential revocation |
| **Storage** | Pluggable storage (in-memory default, SQLite optional) |
| **Crypto** | ES256 (P-256) and EdDSA (Ed25519) via `@noble/curves` |
| **DIDs** | `did:web` and `did:key` — create and resolve |
| **Type-Safe** | Full TypeScript strict mode, all types exported |
| **Dual Build** | ESM + CommonJS, tree-shakeable |

## Scopes & Constraints

Scopes are strings — Credat doesn't prescribe a format. Use whatever makes sense for your domain:

```typescript
// Coarse
scopes: ['read', 'write']

// Fine-grained
scopes: ['email:read', 'calendar:write', 'travel:book']

// Hierarchical
scopes: ['org:acme:project:alpha:deploy']
```

Constraints are open-ended — Credat stores them, your app enforces them:

```typescript
constraints: {
  maxTransactionValue: 5000,      // dollars, tokens, whatever
  allowedDomains: ['api.example.com'],
  rateLimit: 100,                 // requests per hour
  // add any field you need
}
```

After verification, check constraints in your app:

```typescript
if (result.valid && result.constraints?.maxTransactionValue) {
  if (txAmount > result.constraints.maxTransactionValue) {
    throw new Error('Transaction exceeds agent limit')
  }
}
```

## Storage

Agents can be persisted and loaded later:

```typescript
import { createAgent, loadAgent, MemoryStorage } from 'credat'

const storage = new MemoryStorage()

// Create and persist
const agent = await createAgent({ domain: 'example.com', storage })

// Load later
const loaded = await loadAgent({ did: agent.did, storage })
```

For persistence across restarts, use SQLite (optional peer dependency):

```bash
npm install better-sqlite3
```

```typescript
import { SqliteStorage } from 'credat/sqlite'

const storage = new SqliteStorage('./agents.db')
const agent = await createAgent({ domain: 'example.com', storage })
```

## DID Operations

```typescript
import { createDidWeb, createDidKey, resolveDID, generateKeyPair } from 'credat'

// did:web — domain-based, resolvable via HTTPS
const webDid = createDidWeb('example.com', 'agents/assistant')
// → did:web:example.com:agents:assistant

// did:key — self-contained, no network needed
const kp = generateKeyPair('ES256')
const keyDid = createDidKey(kp.publicKey, 'ES256')
// → did:key:zDnae...

// Resolve any DID
const result = await resolveDID('did:web:example.com')
console.log(result.didDocument)
```

## Error Handling

Every error has a machine-readable code and a human-readable message:

```typescript
import { ErrorCodes } from 'credat'

const result = await verifyPresentation(presentation, options)

if (!result.valid) {
  for (const error of result.errors) {
    switch (error.code) {
      case ErrorCodes.HANDSHAKE_EXPIRED:
        // Challenge too old (default: 5 minutes)
        break
      case ErrorCodes.HANDSHAKE_INVALID_NONCE:
        // Nonce mismatch — replay attack?
        break
      case ErrorCodes.HANDSHAKE_VERIFICATION_FAILED:
        // Bad signature or presenter DID mismatch
        break
      case ErrorCodes.DELEGATION_EXPIRED:
        // Delegation VC past its validUntil
        break
      case ErrorCodes.DELEGATION_NOT_YET_VALID:
        // Delegation VC before its validFrom
        break
      case ErrorCodes.DELEGATION_SIGNATURE_INVALID:
        // VC signature doesn't match owner's key
        break
    }
  }
}
```

## Advanced: Low-Level API

All internal modules are exported for full control:

```typescript
import {
  // Crypto primitives
  generateKeyPair,
  sign,
  verifySignature,
  publicKeyToJwk,
  jwkToPublicKey,

  // SD-JWT VC (credential format)
  createSdJwtVc,
  verifySdJwtVc,
  selectDisclosures,

  // Status List (revocation)
  createStatusList,
  setRevocationStatus,
  isRevoked,

  // DID operations
  createDidKey,
  resolveDidKey,
  createDidWeb,
  resolveDidWeb,
  resolveDID,
} from 'credat'
```

## Specifications

| Specification | Status |
|---------------|--------|
| [SD-JWT VC](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/) (draft-14) | Implemented |
| [W3C Status List 2021](https://www.w3.org/TR/vc-status-list/) | Implemented |
| [did:web](https://w3c-ccg.github.io/did-method-web/) | Implemented |
| [did:key](https://w3c-ccg.github.io/did-method-key/) | Implemented |
| ES256 (P-256) / EdDSA (Ed25519) | Implemented |

## Contributing

```bash
git clone https://github.com/credat/credat.git
cd credat
npm install
npm test          # 109 tests
npm run build     # ESM + CJS + .d.ts
npm run typecheck # TypeScript strict
npm run lint      # Biome
```

We follow [conventional commits](https://www.conventionalcommits.org/).

## License

[Apache 2.0](./LICENSE) — free for commercial use.

---

<p align="center">
  Built by <a href="https://maximemansiet.fr">Maxime Mansiet</a> in Bordeaux, France.
</p>
