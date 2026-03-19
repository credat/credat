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

<div align="center">

[![npm](https://img.shields.io/npm/v/@credat/sdk?color=cb3837&logo=npm)](https://www.npmjs.com/package/@credat/sdk)
[![CI](https://github.com/credat/credat/actions/workflows/ci.yml/badge.svg)](https://github.com/credat/credat/actions)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green?logo=node.js)](https://nodejs.org/)

</div>

<div align="center">
  <a href="https://docs.credat.io"><img src="https://img.shields.io/badge/Docs-credat.io-0066cc?style=for-the-badge" /></a>
  <a href="https://github.com/credat/credat/tree/main/examples"><img src="https://img.shields.io/badge/Examples-GitHub-24292e?style=for-the-badge&logo=github" /></a>
  <a href="https://www.npmjs.com/package/@credat/sdk"><img src="https://img.shields.io/badge/npm-@credat/sdk-cb3837?style=for-the-badge&logo=npm" /></a>
  <a href="https://github.com/credat/credat/discussions"><img src="https://img.shields.io/badge/Discussions-GitHub-24292e?style=for-the-badge&logo=github" /></a>
  <a href="https://x.com/credat_dev"><img src="https://img.shields.io/badge/Twitter-@credat__dev-000?style=for-the-badge&logo=x" /></a>
</div>

---

> Your AI agent just mass-emailed 200 contacts, booked $12,000 in flights, and approved three vendor contracts.
> You never authorized any of it.

Agents are multiplying. Authorization hasn't kept up. **Credat fixes that.**

An owner issues scoped credentials to an agent. A service verifies the agent's identity and permissions before acting. Three messages. Cryptographic proof. Done.

**~28KB bundled** · **2 dependencies** · **174 tests** · **Zero config** · **Node.js 22+**

## Quick Start

```bash
npm install @credat/sdk
```

```typescript
import {
  generateKeyPair, createDidWeb, createAgent, delegate,
  createChallenge, presentCredentials, verifyPresentation, hasScope
} from '@credat/sdk'

// Owner identity
const ownerKeyPair = generateKeyPair('ES256')
const ownerDid = createDidWeb('alice.example.com')

// Create an agent
const agent = await createAgent({ domain: 'agents.alice.example.com', path: 'assistant' })

// Delegate scoped permissions
const delegation = await delegate({
  agent: agent.did,
  owner: ownerDid,
  ownerKeyPair,
  scopes: ['email:read', 'calendar:write', 'travel:book'],
  constraints: { maxTransactionValue: 1000 },
  validUntil: new Date(Date.now() + 86_400_000).toISOString(),
})

// Service challenges the agent → Agent presents proof → Service verifies
const challenge = createChallenge({ from: 'did:web:airline.example.com' })
const presentation = await presentCredentials({ challenge, delegation: delegation.token, agent })
const result = await verifyPresentation(presentation, {
  challenge,
  ownerPublicKey: ownerKeyPair.publicKey,
  agentPublicKey: agent.keyPair.publicKey,
})

result.valid                    // true
result.scopes                   // ['email:read', 'calendar:write', 'travel:book']
hasScope(result, 'travel:book') // true
```

The agent proved who it is. The service knows what it can do.

## How It Works

An owner delegates permissions to an agent as a signed credential. When a service needs to trust the agent, they run a three-message handshake: challenge, presentation, verification.

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

**Delegation** — Owner signs an SD-JWT VC encoding scopes and constraints.
**Challenge** — Service sends a random nonce to the agent.
**Presentation** — Agent signs the nonce and presents the delegation credential.
**Verification** — Service verifies nonce signature, VC signature, scopes, and expiration.

## Features

| Feature | Description |
|---------|-------------|
| **Agent Identity** | Create agent identities with `did:web` and `did:key`, auto-generated DID Documents |
| **Delegation** | Issue scoped delegation credentials (SD-JWT VC) with constraints and expiration |
| **Delegation Chains** | Agent → sub-agent delegation with scope subsetting and depth limits |
| **Handshake** | Three-message challenge / presentation / verification protocol |
| **Scope Helpers** | `hasScope`, `hasAnyScope`, `hasAllScopes`, `getAllScopes`, `validateConstraints` |
| **Selective Disclosure** | Agents reveal only the scopes needed for each interaction |
| **Revocation** | W3C Status List 2021 for credential revocation |
| **Storage** | Pluggable storage (in-memory default, SQLite optional) |
| **Crypto** | ES256 (P-256) and EdDSA (Ed25519) via `@noble/curves` |
| **DIDs** | `did:web` and `did:key` — create and resolve |
| **Type-Safe** | Full TypeScript strict mode, discriminated unions, all types exported |
| **Dual Build** | ESM + CommonJS, tree-shakeable |

## Why Credat

- 🔐 **Standards-based** — W3C DIDs + SD-JWT VC. Not proprietary. Your agents speak the same language as the rest of the identity ecosystem.
- 📦 **Two dependencies** — `@noble/curves` and `@noble/hashes`. No blockchain. No cloud service. No vendor lock-in.
- 🦺 **TypeScript-first** — Strict mode, discriminated unions, every type exported. Your IDE catches bugs before you run anything.
- 🔌 **Transport-agnostic** — HTTP, WebSocket, DIDComm, message queue. Credat handles trust, you handle transport.
- 🎯 **Scopes are yours** — Credat stores and verifies permission strings. Your domain defines what they mean.

*Think of it as the **Zod of agent trust** — small, typed, standards-based, does one thing well.*

## Use Cases

- **AI Assistants** — Your agent books flights and sends emails. Credat proves to the airline API it has permission to act on your behalf.
- **Multi-Agent Systems** — Agent A calls Agent B's API. The handshake lets them verify each other's identity and scopes before exchanging data.
- **Customer Service Bots** — A support bot handles refunds up to $500. Delegation constraints enforce the spending limit cryptographically.
- **Agent Marketplaces** — A platform hosts third-party agents, each scoped to exactly what the user authorized.

## Ecosystem

| Integration | Status |
|-------------|--------|
| Node.js / TypeScript | ✅ Available |
| MCP (Model Context Protocol) | 🔨 In Progress |
| LangChain / LangGraph | 🔨 In Progress |
| OpenAI Agents SDK | 📋 Planned |
| Vercel AI SDK | 📋 Planned |

Want an integration? [Open an issue](https://github.com/credat/credat/issues) or [start a discussion](https://github.com/credat/credat/discussions).

## Specifications

| Specification | Status |
|---------------|--------|
| [SD-JWT VC](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/) (draft-14) | Implemented |
| [W3C Status List 2021](https://www.w3.org/TR/vc-status-list/) | Implemented |
| [did:web](https://w3c-ccg.github.io/did-method-web/) | Implemented |
| [did:key](https://w3c-ccg.github.io/did-method-key/) | Implemented |
| ES256 (P-256) / EdDSA (Ed25519) | Implemented |

## Contributing

Credat is young and moving fast. Contributions are welcome — whether it's a bug fix, a new integration, better docs, or just feedback.

```bash
git clone https://github.com/credat/credat.git
cd credat
npm install
npm test          # 174 tests
npm run build     # ESM + CJS + .d.ts
npm run typecheck # TypeScript strict
npm run lint      # Biome
```

We follow [conventional commits](https://www.conventionalcommits.org/). Check out the [open issues](https://github.com/credat/credat/issues) to get started.

## License

[Apache 2.0](./LICENSE) — free for commercial use.

---

<p align="center">
  <a href="https://credat.io">credat.io</a> · <a href="https://docs.credat.io">Docs</a> · <a href="https://www.npmjs.com/package/@credat/sdk">npm</a> · <a href="https://github.com/credat/credat/discussions">Discussions</a> · <a href="https://x.com/credat_dev">Twitter</a>
</p>

<p align="center">
  Built by <a href="https://maximemansiet.fr">Maxime Mansiet</a> in Bordeaux, France.
</p>
