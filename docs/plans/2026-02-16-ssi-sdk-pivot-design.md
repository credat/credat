# SSI Developer SDK — Pivot Design Document

**Date:** 2026-02-16
**Author:** Maxime Mansiet
**Status:** APPROVED
**Context:** Pivot from no-code SaaS platform to developer SDK after strategic review

---

## Executive Summary

Pivoting from a no-code eIDAS 2.0 compliance dashboard (targeting non-technical users via sales calls) to an AI-native TypeScript SDK (targeting fintech developers via Twitter/GitHub). The old product was a founder-market mismatch — Maxime is a developer who distributes on Twitter, not a salesperson who demos dashboards.

**New vision:** The Stripe of SSI — an AI-native TypeScript SDK that makes eIDAS 2.0 credential operations trivially easy for developers.

**Key differentiators vs Credo-TS (primary competitor):**
1. AI-Native DX — schema generation from natural language, AI error messages, compliance checking
2. Radical Simplicity — one package, 10 lines to first credential (vs Credo's multi-package agent framework)
3. eIDAS-First — purpose-built for EU compliance, not adapted from a generic toolkit

---

## Part 1: Product Vision & Positioning

### One-Liner

The AI-native SSI SDK for developers — issue and verify eIDAS 2.0 credentials with natural language schemas and intelligent compliance checking.

### Positioning Statement

For fintech developers who need EUDIW compliance by Dec 2027, [SDK Name] is the first AI-native TypeScript SDK for verifiable credentials. Describe your credential schema in plain English and get type-safe code. Get compliance warnings before you ship, not after. Unlike Credo-TS (raw framework, zero AI) or Walt.id (enterprise-only), our SDK combines dead-simple APIs with AI-powered developer tools — and it's open source.

### Three Pillars of Differentiation

**1. AI-Native DX (unique — nobody else does this)**
- `schema.fromDescription("KYC identity verification for French banking customers")` → typed SD-JWT VC schema
- AI error messages: "Your credential is missing the `assurance_level` claim required for eIDAS LoA High" instead of `INVALID_CREDENTIAL_FORMAT`
- AI-generated test fixtures: realistic mock credentials for your schema
- AI compliance checker: validate credential flows against eIDAS requirements
- Future marketing: AI agent identity patterns (VCs for autonomous agents)

**2. Radical Simplicity (anti-Credo)**
- One npm package, 10 lines to first credential
- Zero SSI knowledge required
- Local dev mode, cloud production mode

**3. eIDAS-First (anti-generic)**
- Built specifically for EU compliance
- SD-JWT VC + mDoc out of the box
- Trust list verification built-in
- RP registration helpers

### Target Developer Persona

Mid-senior TypeScript/Node.js developer at a French fintech or neobank. Uses Stripe, Supabase, Vercel. Has heard of eIDAS 2.0 but doesn't know DIDComm from DID:web. Needs to add EUDIW acceptance to their KYC flow by Dec 2027. Evaluates tools by: docs quality, npm install experience, time to first working example.

### Competitive Positioning

| Dimension | Credo-TS | Walt.id | Paradym | **Our SDK** |
|---|---|---|---|---|
| AI features | None | None | None | **Core differentiator** |
| Getting started | Complex (multi-package) | Enterprise sales | API docs | `npm install` + 10 lines |
| SSI knowledge | Deep | Medium | Medium | **Near-zero (AI assists)** |
| eIDAS focus | Generic | Generic | Medium | **Purpose-built** |
| Hosting | Self-hosted | Cloud/self | Cloud | Local dev + Cloud prod |
| Price | Free (DIY) | €2,500/mo | €25/mo | Free SDK + usage-based |
| License | Apache 2.0 | Apache 2 / Enterprise | Custom | Apache 2.0 |

### Open Source Strategy

- **SDK:** Apache 2.0, public GitHub repo from day 1
- **Cloud backend:** Proprietary (Supabase model)
- **Build in public:** Weekly Twitter updates, all GitHub commits visible
- **Community:** Discord for community, GitHub Discussions for technical Q&A
- **Contributors:** Accept PRs from day 1, maintain CONTRIBUTING.md

---

## Part 2: Technical Architecture

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| SDK scope (v0.1) | Issuance + Verification | Both sides of trust triangle for compelling demos |
| Credential formats | SD-JWT VC + mDoc | Both mandated by eIDAS 2.0 |
| Exchange protocols | OpenID4VCI + OpenID4VP | eIDAS 2.0 standard stack |
| DID methods | did:web + did:key + did:ebsi | Web-first + ephemeral + EU infrastructure |
| Architecture | Single npm package (monolith) | Anti-Credo: simplicity over modularity |
| Monetization | Supabase model | Free SDK locally, paid cloud for production |
| License | Apache 2.0 | Maximum adoption, business-friendly |
| AI depth (v0.1) | DX enhancement | Schema gen, error messages, test fixtures, compliance hints |
| Wallet strategy | Wallet-agnostic via standards | OpenID4VP-compliant wallets work automatically |
| Cloud pricing | Usage-based | €0.02/op pay-as-you-go, free tier 1K ops/month |

### Package Structure

```
@<name>/sdk                    # Single npm package (Apache 2.0)
├── core/                      # Agent initialization, config, types
│   ├── client.ts              # Main entry: createClient()
│   ├── config.ts              # Local vs cloud mode
│   └── types.ts               # All TypeScript types
├── credentials/               # Credential operations
│   ├── issue.ts               # OpenID4VCI issuance
│   ├── verify.ts              # OpenID4VP verification
│   ├── formats/
│   │   ├── sd-jwt-vc.ts       # SD-JWT VC encoding/decoding
│   │   └── mdoc.ts            # ISO 18013-5 mDoc
│   └── schemas/               # Credential schema definitions
├── did/                       # DID resolution & management
│   ├── resolver.ts            # Universal DID resolver
│   ├── methods/
│   │   ├── web.ts             # did:web
│   │   ├── key.ts             # did:key
│   │   └── ebsi.ts            # did:ebsi
│   └── document.ts            # DID Document handling
├── protocols/                 # Exchange protocols
│   ├── openid4vci/            # Credential issuance protocol
│   ├── openid4vp/             # Credential presentation protocol
│   └── trust-lists/           # EU trust list verification
├── ai/                        # AI-powered features
│   ├── schema-generator.ts    # Natural language → schema
│   ├── error-explainer.ts     # Human-readable errors
│   ├── test-fixtures.ts       # Generate mock credentials
│   └── compliance-checker.ts  # eIDAS requirement validation
├── storage/                   # Pluggable storage
│   ├── memory.ts              # In-memory (dev/testing)
│   ├── sqlite.ts              # Local persistence
│   └── cloud.ts               # Cloud backend adapter
└── keys/                      # Key management
    ├── local.ts               # Local key storage (dev)
    └── cloud.ts               # Cloud KMS adapter
```

### API Surface

```typescript
// === INITIALIZATION ===
import { createClient } from '@<name>/sdk'

// Local mode (development)
const client = createClient({ mode: 'local' })

// Cloud mode (production)
const client = createClient({
  mode: 'cloud',
  apiKey: process.env.SDK_API_KEY,
})

// === ISSUANCE (OpenID4VCI) ===
const credential = await client.credentials.issue({
  type: 'KYCVerification',
  claims: {
    givenName: 'Alice',
    familyName: 'Dupont',
    dateOfBirth: '1990-01-15',
    verificationLevel: 'high',
  },
  format: 'sd-jwt-vc',
  selectiveDisclosure: ['dateOfBirth'],
})

// === VERIFICATION (OpenID4VP) ===
const result = await client.credentials.verify({
  credential: presentedCredential,
  requiredClaims: ['givenName', 'familyName', 'verificationLevel'],
  trustList: 'eu',
})

if (result.valid) {
  console.log(result.claims)  // Type-safe extracted claims
}

// === AI FEATURES ===
const schema = await client.ai.generateSchema(
  'KYC identity verification for French banking customers under eIDAS 2.0'
)

const fixtures = await client.ai.generateTestFixtures(schema, { count: 10 })

// === DID MANAGEMENT ===
const did = await client.did.create({ method: 'web', domain: 'example.com' })
const resolved = await client.did.resolve('did:web:example.com')
```

### Local vs Cloud Mode

| Capability | Local Mode (dev) | Cloud Mode (prod) |
|---|---|---|
| Credential issuance | In-memory, self-signed | Cloud KMS, proper signing |
| Credential verification | Local trust list cache | Live EU trust list sync |
| Key management | File-based / in-memory | Cloud HSM / KMS |
| DID anchoring | did:key (ephemeral) | did:web / did:ebsi |
| Storage | SQLite / in-memory | Cloud database |
| AI features | Direct LLM API calls | Cloud AI endpoint |
| Rate limits | None | Based on plan |

### Cloud Backend (Proprietary)

Services provided by the cloud (not in the open-source SDK):
- **Key Management Service** — HSM-backed key storage, rotation, revocation
- **Credential Store** — encrypted credential metadata (not credential content)
- **DID Anchoring** — did:web hosting, did:ebsi registration
- **Trust List Service** — real-time EU trust list monitoring and caching (27 national lists)
- **Revocation Registry** — credential status list management
- **AI Endpoint** — schema generation, compliance checking (LLM calls proxied)
- **Analytics** — credential operation metrics, usage dashboard
- **Webhook System** — notify on credential events

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20+ | Target audience's runtime |
| Language | TypeScript (strict) | Type safety, DX |
| Crypto | `@noble/curves`, `@noble/hashes` | Pure JS, audited, no native deps |
| JWT/SD-JWT | Custom or `sd-jwt-ts` | SD-JWT VC encoding |
| mDoc | Custom (CBOR-based) | ISO 18013-5 encoding |
| HTTP | `undici` or native fetch | Protocol exchanges |
| Storage (local) | `better-sqlite3` | Local persistence |
| AI | OpenAI/Anthropic API (pluggable) | Schema gen, error explanation |
| Testing | Vitest | Fast, TypeScript-native |
| Build | tsup | ESM + CJS dual output |
| Docs | Fumadocs or Starlight | Developer docs site |
| Cloud backend | Node.js + PostgreSQL + OVH | EU data residency |

---

## Part 3: Monetization & Go-to-Market

### Revenue Model: Free SDK + Usage-Based Cloud

**SDK:** Free, open source (Apache 2.0). Always free. No limitations.

**Cloud pricing:**

| Tier | Monthly Ops | Price | Target |
|---|---|---|---|
| **Free** | 1,000 | €0 | Learning, prototyping, hackathons |
| **Pay-as-you-go** | 1,001+ | €0.02/op | Startups, small projects |
| **Pro** | 50,000 included | €99/mo (+€0.01/op overage) | Growing fintechs |
| **Enterprise** | Custom | Custom (volume discounts) | Banks, telecoms |

*"Op" = one credential issuance or verification*

### Revenue Projections (Conservative)

| Month | GitHub Stars | Cloud Users | Paid Users | MRR |
|---|---|---|---|---|
| 3 | 500 | 100 | 5 | €500 |
| 6 | 2,000 | 500 | 30 | €3,000 |
| 12 | 5,000 | 2,000 | 150 | €20,000 |
| 18 | 10,000 | 5,000 | 500 | €75,000 |
| 24 | 20,000+ | 10,000+ | 1,500+ | €200,000+ |

### Go-to-Market Channels (Priority Order)

1. **Twitter/X** — Build in public. Weekly code snippets, "TIL eIDAS" threads, SDK feature announcements, AI demo videos.
2. **GitHub** — README quality, starred repos, responsive issue handling.
3. **Dev content** — Technical blog posts on dev.to, Hashnode, personal blog.
4. **npm discovery** — Package name, keywords, README.
5. **French fintech community** — France FinTech association, La French Tech events.
6. **SEO content** — "eIDAS 2.0 developer guide", "verifiable credentials TypeScript", "EUDIW integration tutorial".

### Launch Sequence

1. **Week 1-2:** Ship SDK v0.1 to npm. Tweet thread. Polished README.
2. **Week 3-4:** First blog posts (getting started, "why we built this", AI schema demo).
3. **Week 5-8:** Cloud beta. First paying users. Discord community.
4. **Week 9-12:** v0.2 (CLI, expanded wallet testing, more AI features).
5. **Ongoing:** Weekly Twitter content, monthly blog, 24h GitHub issue response SLA.

### Content Strategy

The content gap identified in PMF research is still massive:
- French-language eIDAS developer content is nearly nonexistent
- The "OneTrust of eIDAS" developer content position is unclaimed
- Target: become THE reference for eIDAS 2.0 developer content (FR + EN)

### Community Building

- **Discord** — Primary community hub
- **GitHub Discussions** — Technical Q&A, RFCs
- **Contributors** — Accept PRs from day 1, CONTRIBUTING.md
- **Champions program** — Early adopters get featured, beta access, direct channel with Maxime

---

## Part 4: Scope Boundaries

### IN v0.1 (Ship in 2-3 weeks)

**SDK Core:**
- `createClient()` with local/cloud modes
- Credential issuance via OpenID4VCI (SD-JWT VC + mDoc)
- Credential verification via OpenID4VP (SD-JWT VC + mDoc)
- Selective disclosure support
- DID resolution for did:web, did:key, did:ebsi
- Type-safe credential schemas (TypeScript generics)
- In-memory and SQLite storage adapters
- Local key management (file-based)

**AI Features:**
- Schema generation from natural language description
- AI-powered error messages (human-readable explanations)
- Test fixture generation
- Basic eIDAS compliance hints on schemas

**Developer Experience:**
- Polished README with copy-paste examples
- TypeScript types exported (great autocomplete)
- ESM + CJS dual build
- Getting started guide (docs site)
- 3-5 example projects (Next.js KYC flow, Express API, etc.)

**Cloud (beta):**
- Cloud KMS (key management)
- Cloud credential storage
- Basic usage dashboard
- Free tier (1,000 ops/month)

### OUT of v0.1 (Explicitly Deferred)

| Feature | Deferred To | Rationale |
|---|---|---|
| CLI tool | v0.2 | Not needed for core SDK |
| DIDComm support | v0.3+ | Not required for eIDAS |
| Holder wallet SDK | v0.2 | Focus on issuer+verifier |
| React Native support | v0.3+ | Node.js first |
| Multi-tenancy | v0.2 | Cloud feature |
| Trust list auto-sync | v0.2 | Manual/cached for v0.1 |
| Revocation registry | v0.2 | Ship core first |
| Enterprise features (SSO, audit) | v0.3+ | Revenue-driven |
| AnonCreds format | Never (or v1.0+) | Not eIDAS-mandated |
| Dashboard/UI | Never | SDK, not SaaS |
| No-code features | Never | Old product |
| AI agent identity | Content/demo only | Marketing, not core |
| SOC2/ISO certifications | Growth phase | Tech quality first |

### Open Items (Blocking Development)

1. **Product name** — must be: short (5-7 chars), npm-available, domain-available, developer-friendly. NOT "SSI" or "credential" in the name.
2. **Logo** — needed before v0.1 launch (even a simple wordmark)
3. **LLM provider for AI features** — Anthropic Claude API vs OpenAI? Or pluggable adapter?
4. **Cloud hosting specifics** — OVH confirmed, but serverless vs containers?

---

## Part 5: What's Reusable From Previous Work

### Fully Reusable (100%)
- Domain research — eIDAS 2.0 regulation, protocol landscape, standards timeline
- Market research — competitive landscape, market sizing, buyer behavior
- GDPR analog timing analysis — panic wave prediction, content gap

### Mostly Reusable (80-90%)
- PMF validation — market timing, niche ranking (fintech #1 still valid), content opportunity
- Competitive intelligence — all competitor profiles still valid, just re-target for developer buyer

### Partially Reusable (40-50%)
- Pricing research — competitor price benchmarks valid, but our model changes entirely (usage-based vs subscription)
- Niche #2 (compliance consultancies) — they may still buy cloud access for client demos

### Not Reusable (0%)
- PRD (41 functional requirements for no-code dashboard)
- UX Design (14 steps for non-technical UI)
- Old pricing tiers (subscription for dashboard users)
- UX components (Credential Card, Schema Builder UI, etc.)

---

## Part 6: Comparison — Old vs New

| Dimension | Old (No-Code Platform) | New (Developer SDK) |
|---|---|---|
| Buyer | Compliance officers, HR | Developers, CTOs |
| Distribution | Cold email, sales calls | Twitter, GitHub, dev communities |
| Product | Dashboard, drag-and-drop | SDK, API, CLI, docs |
| Moat | UX, no-code simplicity | DX, AI features, community |
| Open source | No (proprietary) | Yes (SDK open, cloud paid) |
| Time to try | Sign up, onboarding wizard | `npm install`, 5 minutes |
| Revenue model | Subscription tiers €199-1,499/mo | Free SDK + usage-based cloud |
| Complexity | 41 FRs, massive scope | ~15 FRs, focused |
| Build time | 8+ weeks | Core SDK 2-3 weeks |
| AI role | Compliance assistant (Growth) | Core differentiator (Day 1) |
| Founder fit | Low (requires sales) | High (developer, Twitter) |

---

**Design Document Approved:** 2026-02-16
**Next Step:** Implementation plan via writing-plans skill
