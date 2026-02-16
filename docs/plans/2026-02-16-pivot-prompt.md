# PIVOT SESSION PROMPT — SSI Developer SDK

Copy everything below this line into a new chat.

---

## Context: Who I Am

I'm Maxime Mansiet, fullstack dev at Verana & 2060.io (SSI companies), founder of Klyx.fr. I have deep expertise in SSI protocols (DIDComm, Verifiable Credentials, DIDs, OpenID4VP/VCI, SD-JWT VC). I'm a developer, NOT a salesperson. My distribution channel is Twitter/X and GitHub — I build in public, I don't cold call.

## Context: What I Was Building (OLD — ABANDONED)

I spent 6+ days planning a **no-code SaaS platform for eIDAS 2.0 compliance** — "Shopify for verifiable credentials." Full trust triangle (Issuer + Verifier + Holder) in one no-code dashboard targeting non-technical users (compliance officers, HR managers). Pricing €199-1,499/mo.

The BMAD workflow produced:
- Brainstorming session: `_bmad-output/brainstorming/brainstorming-session-2026-02-10.md`
- Domain research: `_bmad-output/planning-artifacts/research/domain-eidas-ssi-platform-research-2026-02-10.md`
- Market research: `_bmad-output/planning-artifacts/research/market-ssi-eidas-vc-platform-research-2026-02-11.md`
- PMF validation: `_bmad-output/planning-artifacts/research/pmf-niche-validation-research-2026-02-16.md`
- Pricing research: `_bmad-output/planning-artifacts/research/pricing-strategy-research-2026-02-15.md`
- PMF+Pricing strategy: `docs/plans/2026-02-16-pmf-pricing-strategy-design.md`
- PRD (41 FRs, 12 steps): `_bmad-output/planning-artifacts/prd.md`
- UX Design (14 steps): `_bmad-output/planning-artifacts/ux-design-specification.md`
- Architecture, Epics, Stories: NOT started yet (clean slate)

## Context: Why I'm Pivoting

Key realizations from strategic review session (2026-02-16):

1. **Product-founder mismatch.** I was building a product for non-technical buyers (compliance officers) that requires sales calls, demos, and enterprise outreach. I'm a developer who distributes on Twitter. The product didn't match ME.

2. **Over-planning, zero validation.** 6+ days of planning, zero customer interviews, zero code, PMF score 5/10, zero organic buyer-pull signals (no Reddit threads, no Stack Overflow questions, no LinkedIn pain from buyers). The "pain" isn't felt yet.

3. **Scope explosion.** 41 functional requirements, 7 custom components, 5 user journeys, drag-and-drop everything — this is a Series A product, not an MVP for a solo founder.

4. **Wrong buyer for my distribution.** Twitter reaches developers. Developers don't need a no-code dashboard — they need an SDK. I was designing a product I couldn't distribute.

5. **Where I see myself in 6 months:** shipping code, tweeting about SSI, merging PRs from contributors. Not on calls demoing dashboards.

## What I'm Pivoting TO: SSI Developer SDK

**New vision: Build the Stripe/Supabase of SSI.** A TypeScript SDK that makes verifiable credentials trivially easy for developers. `npm install` → issue a credential in 10 lines of code.

### Core product concept:
- **TypeScript-first SDK** that abstracts away OpenID4VP/VCI, SD-JWT VC, DID resolution into a clean, simple API
- **Open source the SDK** — GitHub stars, Twitter traction, community contributions
- **Monetize with hosted infrastructure** (Supabase model): free SDK, paid cloud for key management, credential storage, revocation registry, DID anchoring
- **AI angle for DX**: AI-powered schema builder ("describe your credential in plain English"), AI compliance checker for credential formats, AI-generated test fixtures — the viral tweet material
- **Build in public on Twitter** — weekly updates, code snippets, "TIL about eIDAS" threads, become THE SSI developer reference

### Key differences from old product:

| Dimension | Old (No-Code Platform) | New (Developer SDK) |
|-----------|----------------------|---------------------|
| Buyer | Compliance officers, HR | Developers, CTOs |
| Distribution | Cold email, sales calls | Twitter, GitHub, dev communities |
| Product | Dashboard, drag-and-drop | SDK, API, CLI, docs |
| Moat | UX, no-code simplicity | DX, abstraction quality, community |
| Open source | No (proprietary) | Yes (SDK open, cloud paid) |
| Time to try | Sign up, onboarding wizard | `npm install`, 5 minutes |
| Revenue model | Subscription tiers | Free SDK + usage-based cloud |
| Complexity | 41 FRs, massive | 10-15 FRs, focused |
| Build time | 8+ weeks | Core SDK in 2-3 weeks |

### AI agent identity angle (potential differentiator):
AI agents need verifiable identities to act on behalf of humans/orgs. How does a bank verify an AI agent is authorized to request a KYC check? That's SSI + VCs. Nobody has solved this yet. This could be a unique positioning angle — not just "SSI for eIDAS compliance" but "identity for the agentic era."

## What's REUSABLE from previous BMAD work

READ these files — they contain validated research that still applies:

1. **Domain research** (100% reusable) — `_bmad-output/planning-artifacts/research/domain-eidas-ssi-platform-research-2026-02-10.md`
   - eIDAS 2.0 regulation details, EUDIW architecture, SSI protocol landscape

2. **Market research** (90% reusable) — `_bmad-output/planning-artifacts/research/market-ssi-eidas-vc-platform-research-2026-02-11.md`
   - Competitive landscape, market size, existing players and their weaknesses

3. **PMF validation** (80% reusable) — `_bmad-output/planning-artifacts/research/pmf-niche-validation-research-2026-02-16.md`
   - Market timing (GDPR analog — we're in awareness phase, panic wave Q3-Q4 2026)
   - Content gap analysis (still valid, massive SEO opportunity)
   - Niche ranking needs reframing for developer buyer
   - Key stat: 51% of French decision-makers don't know eIDAS 2.0

4. **Pricing research** (partially reusable) — `_bmad-output/planning-artifacts/research/pricing-strategy-research-2026-02-15.md`
   - Competitor pricing benchmarks (Dock $499/mo, Paradym €25/mo API-only, etc.)
   - Pricing model changes entirely (usage-based vs subscription)

## What NEEDS TO BE REDONE

1. **Pivot brainstorm** — Short session, not full from-scratch. Same market, different product, different buyer. Focus on: exact SDK scope, API surface design, open source strategy, AI integration points, monetization model, community building plan.

2. **New PRD** — Much lighter than previous (10-15 FRs vs 41). New personas (developer integrating eIDAS, developer building identity features). New capability areas (SDK core, cloud API, CLI tools, documentation, AI helpers).

3. **DX Design** (replaces UX Design) — API ergonomics, getting started experience, documentation structure, code examples, error messages, TypeScript types quality. NOT 14 steps — much simpler.

4. **Architecture** — SDK architecture + optional cloud backend. Hadn't started this, so clean slate.

5. **Epics/Stories** — Hadn't started, clean slate. Will be fewer and more focused.

## Market context (Feb 2026)

- eIDAS 2.0 regulation entered into force May 2024
- Public sector deadline: Dec 2026
- Private sector deadline: Dec 2027
- Current state: awareness phase, panic wave expected Q3-Q4 2026
- Standards finalized: W3C VC v2.0 (May 2025), OpenID4VP 1.0 Final (July 2025)
- Apple announced W3C Digital Credentials API support (WWDC 2025)
- Developer ecosystem is early (low npm downloads, minimal Stack Overflow activity)
- Content gap in French eIDAS developer content is massive and unclaimed
- No "Stripe of SSI" exists — all competitors are either enterprise-only or have terrible DX

## Existing competitors (developer-relevant):

| Player | Model | DX Quality | Weakness |
|--------|-------|-----------|----------|
| Walt.id | Enterprise, €2,500/mo | Medium | Expensive, enterprise-focused |
| Dock/Truvera | $499/mo, 250 creds | Medium | Expensive per credential |
| Paradym | €25/mo, API-only | Good | Limited, Credo.ts based |
| Gataca | €12/mo entry | Medium | Spanish, limited SDK |
| SpruceID | Open source | Good | No managed cloud, DIY |
| Microsoft Entra Verified ID | Free (Azure) | Poor | Azure lock-in, terrible DX |
| Talao | Custom | Medium | French but wallet-focused |

## Open decisions (to resolve during brainstorm)

1. **Exact SDK scope for v1:** Issuance only? Verification only? Both? Start with ONE side of the triangle.
2. **AI integration depth:** DX enhancement (schema generation) vs core feature (agent identity)?
3. **Cloud backend architecture:** What's free vs paid? Usage-based pricing model?
4. **Open source license:** MIT? Apache 2.0? AGPL for cloud parts?
5. **Product name:** Still needed. Now should resonate with developers (short, memorable, npm-friendly).
6. **Target developer persona:** Fintech devs building KYC? General web devs adding identity? AI agent builders?
7. **Which protocols to support first:** OpenID4VP? OpenID4VCI? SD-JWT VC? mDL?
8. **Wallet strategy:** Support EUDIW/France Identité as verification target? Or wallet-agnostic?

## BMAD workflow for this session

Execute the BMAD workflow adapted for the pivot:

1. **Pivot brainstorm** (use `bmad-help` for guidance) — Read the reusable research files above, then run a focused brainstorm on the new developer SDK product. Don't repeat domain/market research — it's done.

2. **New PRD** — Lighter, SDK-scoped. New personas, new FRs, new build sequence.

3. **DX Design** (replaces UX) — API design, docs structure, getting started flow.

4. **Architecture (CA)** — SDK + cloud architecture.

5. **Epics/Stories (CE)** — Focused on shipping SDK v0.1 fast.

6. **Implementation Readiness (IR)** — Then build.

Start with step 1: the pivot brainstorm. Read the reusable research files first, then let's brainstorm the new product.## Context: Who I Am

I'm Maxime Mansiet, fullstack dev at Verana & 2060.io (SSI companies), founder of Klyx.fr. I have deep expertise in SSI protocols (DIDComm, Verifiable Credentials, DIDs, OpenID4VP/VCI, SD-JWT VC). I'm a developer, NOT a salesperson. My distribution channel is Twitter/X and GitHub — I build in public, I don't cold call.

## Context: What I Was Building (OLD — ABANDONED)

I spent 6+ days planning a **no-code SaaS platform for eIDAS 2.0 compliance** — "Shopify for verifiable credentials." Full trust triangle (Issuer + Verifier + Holder) in one no-code dashboard targeting non-technical users (compliance officers, HR managers). Pricing €199-1,499/mo.

The BMAD workflow produced:
- Brainstorming session: `_bmad-output/brainstorming/brainstorming-session-2026-02-10.md`
- Domain research: `_bmad-output/planning-artifacts/research/domain-eidas-ssi-platform-research-2026-02-10.md`
- Market research: `_bmad-output/planning-artifacts/research/market-ssi-eidas-vc-platform-research-2026-02-11.md`
- PMF validation: `_bmad-output/planning-artifacts/research/pmf-niche-validation-research-2026-02-16.md`
- Pricing research: `_bmad-output/planning-artifacts/research/pricing-strategy-research-2026-02-15.md`
- PMF+Pricing strategy: `docs/plans/2026-02-16-pmf-pricing-strategy-design.md`
- PRD (41 FRs, 12 steps): `_bmad-output/planning-artifacts/prd.md`
- UX Design (14 steps): `_bmad-output/planning-artifacts/ux-design-specification.md`
- Architecture, Epics, Stories: NOT started yet (clean slate)

## Context: Why I'm Pivoting

Key realizations from strategic review session (2026-02-16):

1. **Product-founder mismatch.** I was building a product for non-technical buyers (compliance officers) that requires sales calls, demos, and enterprise outreach. I'm a developer who distributes on Twitter. The product didn't match ME.

2. **Over-planning, zero validation.** 6+ days of planning, zero customer interviews, zero code, PMF score 5/10, zero organic buyer-pull signals (no Reddit threads, no Stack Overflow questions, no LinkedIn pain from buyers). The "pain" isn't felt yet.

3. **Scope explosion.** 41 functional requirements, 7 custom components, 5 user journeys, drag-and-drop everything — this is a Series A product, not an MVP for a solo founder.

4. **Wrong buyer for my distribution.** Twitter reaches developers. Developers don't need a no-code dashboard — they need an SDK. I was designing a product I couldn't distribute.

5. **Where I see myself in 6 months:** shipping code, tweeting about SSI, merging PRs from contributors. Not on calls demoing dashboards.

## What I'm Pivoting TO: SSI Developer SDK

**New vision: Build the Stripe/Supabase of SSI.** A TypeScript SDK that makes verifiable credentials trivially easy for developers. `npm install` → issue a credential in 10 lines of code.

### Core product concept:
- **TypeScript-first SDK** that abstracts away OpenID4VP/VCI, SD-JWT VC, DID resolution into a clean, simple API
- **Open source the SDK** — GitHub stars, Twitter traction, community contributions
- **Monetize with hosted infrastructure** (Supabase model): free SDK, paid cloud for key management, credential storage, revocation registry, DID anchoring
- **AI angle for DX**: AI-powered schema builder ("describe your credential in plain English"), AI compliance checker for credential formats, AI-generated test fixtures — the viral tweet material
- **Build in public on Twitter** — weekly updates, code snippets, "TIL about eIDAS" threads, become THE SSI developer reference

### Key differences from old product:

| Dimension | Old (No-Code Platform) | New (Developer SDK) |
|-----------|----------------------|---------------------|
| Buyer | Compliance officers, HR | Developers, CTOs |
| Distribution | Cold email, sales calls | Twitter, GitHub, dev communities |
| Product | Dashboard, drag-and-drop | SDK, API, CLI, docs |
| Moat | UX, no-code simplicity | DX, abstraction quality, community |
| Open source | No (proprietary) | Yes (SDK open, cloud paid) |
| Time to try | Sign up, onboarding wizard | `npm install`, 5 minutes |
| Revenue model | Subscription tiers | Free SDK + usage-based cloud |
| Complexity | 41 FRs, massive | 10-15 FRs, focused |
| Build time | 8+ weeks | Core SDK in 2-3 weeks |

### AI agent identity angle (potential differentiator):
AI agents need verifiable identities to act on behalf of humans/orgs. How does a bank verify an AI agent is authorized to request a KYC check? That's SSI + VCs. Nobody has solved this yet. This could be a unique positioning angle — not just "SSI for eIDAS compliance" but "identity for the agentic era."

## What's REUSABLE from previous BMAD work

READ these files — they contain validated research that still applies:

1. **Domain research** (100% reusable) — `_bmad-output/planning-artifacts/research/domain-eidas-ssi-platform-research-2026-02-10.md`
   - eIDAS 2.0 regulation details, EUDIW architecture, SSI protocol landscape

2. **Market research** (90% reusable) — `_bmad-output/planning-artifacts/research/market-ssi-eidas-vc-platform-research-2026-02-11.md`
   - Competitive landscape, market size, existing players and their weaknesses

3. **PMF validation** (80% reusable) — `_bmad-output/planning-artifacts/research/pmf-niche-validation-research-2026-02-16.md`
   - Market timing (GDPR analog — we're in awareness phase, panic wave Q3-Q4 2026)
   - Content gap analysis (still valid, massive SEO opportunity)
   - Niche ranking needs reframing for developer buyer
   - Key stat: 51% of French decision-makers don't know eIDAS 2.0

4. **Pricing research** (partially reusable) — `_bmad-output/planning-artifacts/research/pricing-strategy-research-2026-02-15.md`
   - Competitor pricing benchmarks (Dock $499/mo, Paradym €25/mo API-only, etc.)
   - Pricing model changes entirely (usage-based vs subscription)

## What NEEDS TO BE REDONE

1. **Pivot brainstorm** — Short session, not full from-scratch. Same market, different product, different buyer. Focus on: exact SDK scope, API surface design, open source strategy, AI integration points, monetization model, community building plan.

2. **New PRD** — Much lighter than previous (10-15 FRs vs 41). New personas (developer integrating eIDAS, developer building identity features). New capability areas (SDK core, cloud API, CLI tools, documentation, AI helpers).

3. **DX Design** (replaces UX Design) — API ergonomics, getting started experience, documentation structure, code examples, error messages, TypeScript types quality. NOT 14 steps — much simpler.

4. **Architecture** — SDK architecture + optional cloud backend. Hadn't started this, so clean slate.

5. **Epics/Stories** — Hadn't started, clean slate. Will be fewer and more focused.

## Market context (Feb 2026)

- eIDAS 2.0 regulation entered into force May 2024
- Public sector deadline: Dec 2026
- Private sector deadline: Dec 2027
- Current state: awareness phase, panic wave expected Q3-Q4 2026
- Standards finalized: W3C VC v2.0 (May 2025), OpenID4VP 1.0 Final (July 2025)
- Apple announced W3C Digital Credentials API support (WWDC 2025)
- Developer ecosystem is early (low npm downloads, minimal Stack Overflow activity)
- Content gap in French eIDAS developer content is massive and unclaimed
- No "Stripe of SSI" exists — all competitors are either enterprise-only or have terrible DX

## Existing competitors (developer-relevant):

| Player | Model | DX Quality | Weakness |
|--------|-------|-----------|----------|
| Walt.id | Enterprise, €2,500/mo | Medium | Expensive, enterprise-focused |
| Dock/Truvera | $499/mo, 250 creds | Medium | Expensive per credential |
| Paradym | €25/mo, API-only | Good | Limited, Credo.ts based |
| Gataca | €12/mo entry | Medium | Spanish, limited SDK |
| SpruceID | Open source | Good | No managed cloud, DIY |
| Microsoft Entra Verified ID | Free (Azure) | Poor | Azure lock-in, terrible DX |
| Talao | Custom | Medium | French but wallet-focused |

## Open decisions (to resolve during brainstorm)

1. **Exact SDK scope for v1:** Issuance only? Verification only? Both? Start with ONE side of the triangle.
2. **AI integration depth:** DX enhancement (schema generation) vs core feature (agent identity)?
3. **Cloud backend architecture:** What's free vs paid? Usage-based pricing model?
4. **Open source license:** MIT? Apache 2.0? AGPL for cloud parts?
5. **Product name:** Still needed. Now should resonate with developers (short, memorable, npm-friendly).
6. **Target developer persona:** Fintech devs building KYC? General web devs adding identity? AI agent builders?
7. **Which protocols to support first:** OpenID4VP? OpenID4VCI? SD-JWT VC? mDL?
8. **Wallet strategy:** Support EUDIW/France Identité as verification target? Or wallet-agnostic?

## BMAD workflow for this session

Execute the BMAD workflow adapted for the pivot:

1. **Pivot brainstorm** (use `bmad-help` for guidance) — Read the reusable research files above, then run a focused brainstorm on the new developer SDK product. Don't repeat domain/market research — it's done.

2. **New PRD** — Lighter, SDK-scoped. New personas, new FRs, new build sequence.

3. **DX Design** (replaces UX) — API design, docs structure, getting started flow.

4. **Architecture (CA)** — SDK + cloud architecture.

5. **Epics/Stories (CE)** — Focused on shipping SDK v0.1 fast.

6. **Implementation Readiness (IR)** — Then build.

Start with step 1: the pivot brainstorm. Read the reusable research files first, then let's brainstorm the new product.
