# PMF Validation & Pricing Strategy — SSI-SAAS Platform

**Date:** 2026-02-16
**Author:** Maxime Mansiet (research assisted by Claude)
**Status:** APPROVED
**Context:** Founder-initiated review of product-market fit and pricing model, informed by SaaS sales framework (Quentin Despas/MIM "10 leçons SaaS") and comprehensive desk research.

---

## Executive Summary

Two parallel research streams — PMF demand validation (95+ web searches across demand signals, niche identification, and timing analysis) and pricing strategy analysis (44 web searches across competitor benchmarks, adjacent compliance SaaS pricing, and value-based analysis) — confirm two key findings:

1. **The market is real but the timing window hasn't fully opened.** We are in GDPR-2016 equivalent — 51% of French decision-makers don't know eIDAS 2.0 exists. The "panic wave" is expected Q3-Q4 2026. Starting content and product development NOW positions us perfectly for the wave.

2. **Current pricing is fundamentally broken.** The platform captures <1% of value delivered (industry standard: 10-20%). €29/mo signals "toy product" in a market where compliance SaaS starts at €500+/mo. Pricing should be 4-7x higher.

**Key strategic decisions made:**
- **Niche first:** Target French fintechs (#1) and compliance consultancies (#2) — not "all European SMEs"
- **Message pivot:** Never say "SSI" or "verifiable credentials" — speak the buyer's language: "conformité eIDAS 2.0", "portefeuille identité numérique", "KYC conforme"
- **Premium pricing:** Starter €199/mo, Professional €599/mo, Business €1,499/mo (with founding member discounts)
- **Content-first timeline:** Start publishing SEO content immediately, ship MVP by mid-2026, catch the panic wave

---

## Part 1: PMF Validation

### PMF Confidence Score: 5/10 — "Promising, timing is early, positioning window is NOW"

### 1.1 Market Timing (GDPR Analog)

| GDPR Phase | Date | eIDAS 2.0 Equivalent | Date | Status |
|-----------|------|---------------------|------|--------|
| Regulation adopted | Apr 2016 | Regulation entered into force | May 2024 | Done |
| **Awareness** | Q3 2016 - Q2 2017 | **Awareness phase** | **Q4 2024 - Q2 2026** | **WE ARE HERE** |
| Preparation/early panic | Q3-Q4 2017 | Expected preparation rush | Q3-Q4 2026 | ~6 months away |
| Full panic | Q1-Q2 2018 | Expected full panic (private sector) | H1 2027 | ~12 months away |
| Enforcement | May 2018 | Public: Dec 2026, Private: Dec 2027 | Dec 2026/2027 | Coming |
| Post-enforcement boom | 2018-2020 | Expected tooling boom | 2027-2029 | Future |

**Key evidence:**
- 51% of French business decision-makers don't know what eIDAS 2.0 is (Yousign/Ipsos)
- Zero Reddit threads, zero Stack Overflow questions, no LinkedIn panic from buyers
- All eIDAS content is vendor-push, not buyer-pull
- Job market signals show hiring at infrastructure level (banks/gov building in-house), not at application level (SMEs buying SaaS)
- BUT: 550+ organizations in EU Large Scale Pilots, APTITUDE consortium launched Oct 2025 (117 partners, led by France)

**Interpretation:** The market is 6-12 months from activation. Starting NOW with content and positioning is the optimal play — exactly what the founders who built GDPR tools in 2017 did.

### 1.2 Niche Ranking (Quentin's Framework: "smallest market you can dominate in 9 months")

| Rank | Niche | Urgency | Market Size (FR) | Willingness to Pay | Accessibility | Score |
|------|-------|---------|-----------------|-------------------|---------------|-------|
| **#1** | **French fintechs/neobanks** | 8/10 | ~200-300 companies | HIGH | MEDIUM | **28/40** |
| **#2** | **Compliance consultancies** | 7/10 | ~50-100 firms | HIGH | HIGH | **28/40** |
| #3 | EU pilot participants | 8/10 | 550+ orgs (EU-wide) | MEDIUM | LOW | 22/40 |
| #4 | French universities | 6/10 | ~75 public + grandes écoles | LOW | MEDIUM | 16/40 |
| #5 | French telecoms | 5/10 | ~4-5 operators | HIGH | VERY LOW | 14/40 |
| #6 | French HR/employment | 4/10 | Large but diffuse | MEDIUM | LOW | 12/40 |
| #7 | French healthcare | 5/10 | Large | LOW | VERY LOW | 10/40 |

**Recommended starting niche: Compliance consultancies (#2) FIRST, then French fintechs (#1).**

Rationale: Consultancies have the **fastest sales cycle** (2-3 months) and are **actively looking for tools** to demo to their clients. They become your distribution channel to fintechs. Sign 5-10 consulting firms → they bring their clients → fintech niche opens naturally.

### 1.3 Message-Market Fit

**Vocabulary mismatch is EXTREME.** Builders and buyers speak completely different languages:

| Builder Term (WRONG) | Buyer Searches For (RIGHT) |
|----------------------|--------------------------|
| SSI platform | (nobody searches this) |
| Verifiable credentials | attestation numérique, identité numérique |
| Self-sovereign identity | (unknown outside SSI community) |
| DID/DIDComm | (unknown outside SSI community) |
| EUDIW integration | portefeuille identité numérique, France Identité |
| Credential issuance API | KYC automatisé, vérification identité |
| Trust registry | prestataire de confiance qualifié |

**Recommended messaging:**
- **Tagline:** "Prêt pour le portefeuille européen d'identité. Conforme en quelques jours."
- **EN:** "Ready for the European identity wallet. Compliant in days."
- **Value prop for fintechs:** "Acceptez le portefeuille européen d'identité dans vos parcours KYC en quelques jours, pas en 18 mois."
- **Value prop for consultancies:** "Montrez à vos clients comment fonctionne l'identité numérique européenne. Démo en 5 minutes."

### 1.4 Content Gap (SEO Opportunity)

**Current French eIDAS content landscape is dominated by 6-8 players:**
- Signaturit (Spain) — strongest SEO, 3+ articles
- DocuSign (USA) — generic but well-ranked
- Yousign (France) — good but older content (2023)
- Oodrive, CGI France, Goodflag — emerging

**What's MISSING (= our content opportunity):**
- No practical "how-to" implementation guides (all content is "what is eIDAS")
- No sector-specific compliance guides ("eIDAS pour les fintechs", "eIDAS pour les universités")
- No comparison/tool review content
- No French-language developer documentation
- No cost/ROI calculators
- No interactive compliance assessment tools

**This gap will be filled by someone. It should be us.**

### 1.5 Competitive Landscape Update

| Player | Threat Level | Why |
|--------|-------------|-----|
| **Hopae** | HIGH | €5M EU expansion, first registered eIDAS 2.0 intermediary |
| **Signaturit/VIDchain** | HIGH | Strongest SEO, full Europass integration |
| **Microsoft Entra Verified ID** | HIGH | Azure ecosystem, but US-centric |
| **Gataca** | MEDIUM | €12/mo entry, but developer-focused |
| **Lissi** | MEDIUM | Strong wallet connector, but enterprise-only on-prem |
| **Talao** | MEDIUM | French, wallet-as-a-service, but not SaaS platform |
| **BCdiploma** | LOW | Education niche only |

**The gap remains:** No player has achieved "Shopify of verifiable credentials" — self-service, no-code, affordable, European-first.

---

## Part 2: Pricing Strategy

### 2.1 Value-Based Analysis

| Value Driver | Annual Value to Customer | Current Price (Pro €149/mo) | Capture Rate |
|-------------|------------------------|---------------------------|-------------|
| Penalty/compliance risk avoidance | €10K-50K/yr | €1,788/yr | 3.6-18% |
| KYC cost reduction (5K verif/mo) | €90K/yr | €1,788/yr | 2% |
| Build vs buy savings | €100K+/yr (amortized) | €1,788/yr | 1.8% |
| Consulting replacement | €50K-200K first year | €1,788/yr | 0.9-3.6% |
| **Total** | **€250K-440K/yr** | **€1,788/yr** | **0.4-0.7%** |

**Industry standard value capture: 10-20%.** At 10% of conservative estimate (€250K): platform should cost **€2,083/mo.**

### 2.2 Competitive Pricing Benchmarks

**Direct SSI competitors:**
| Company | Entry Price | Notes |
|---------|------------|-------|
| Walt.id | €2,500/mo | Enterprise managed service |
| Dock/Truvera | $499/mo | 250 production credentials |
| Paradym | €25/mo | API-only, dev tool (not comparable) |
| Gataca | €12/mo | Basic/testing tier |

**Adjacent compliance SaaS (what buyers are USED TO paying):**
| Company | Entry Price | Category |
|---------|------------|----------|
| Vanta | €833/mo (€10K/yr) | SOC 2/ISO 27001 |
| Drata | €625/mo (€7.5K/yr) | Compliance automation |
| Sprinto | €583/mo (€7K/yr) | Compliance automation |
| OneTrust | €827/mo (single module) | Privacy/GDPR |
| Secureframe | €625/mo (€7.5K/yr) | Compliance platform |

**No compliance SaaS charges under €500/mo for production use.**

### 2.3 Pricing Psychology Findings

1. **"Too cheap to trust" effect:** 81% of enterprise buyers consider vendor trustworthiness critical. Price is a primary trust signal. EUR 29/mo disqualifies you from enterprise procurement.
2. **Budget allocation signal:** €349/year request = "nice to have." €7,200/year request = "critical infrastructure." The latter gets approved faster.
3. **Niche premium:** B2B buyers pay 20-30% more for niche-specialized solutions (Stanford/ProfitWell).
4. **SaaS price inflation:** 8.7% YoY in 2025. 50%+ of growth comes from price increases, not new customers.

### 2.4 New Pricing Model (APPROVED)

| Tier | Old Price | **New Price** | Annual (10% off) | Creds/mo | Users | Target |
|------|-----------|--------------|-----------------|----------|-------|--------|
| Sandbox | €0 | **€0** | €0 | 50 test | 1 | Evaluation |
| Starter | ~~€29~~ | **€199/mo** | €2,148/yr | 500 | 1 | Solo compliance officer, small company |
| Professional | ~~€149~~ | **€599/mo** | €6,468/yr | 5,000 | 5 | Mid-market, regulated SME |
| Business | ~~€499~~ | **€1,499/mo** | €16,188/yr | 25,000 | 15 | Large SME, multi-department |
| Enterprise | Custom | **From €3,000/mo** | Custom | Unlimited | Unlimited | Large enterprise, multi-country |

**Launch discount (first 100 customers, lifetime lock):**

| Tier | Launch Price | Regular Price | Discount |
|------|-------------|---------------|----------|
| Starter | €129/mo | €199/mo | 35% |
| Professional | €399/mo | €599/mo | 33% |
| Business | €999/mo | €1,499/mo | 33% |

### 2.5 Revenue Projections

| Metric | Old Pricing (200 customers) | New Pricing (200 customers) | New Pricing (1,000 customers) |
|--------|---------------------------|---------------------------|-------------------------------|
| Weighted avg MRR/customer | ~€150 | ~€571 | ~€679 |
| MRR | €30,000 | €114,200 | €678,500 |
| **ARR** | **€360,000** | **€1,370,400** | **€8,142,000** |

**Same 200 customers = 3.8x more revenue.**

### 2.6 Price Anchoring Strategy (Pricing Page Design)

1. Show Enterprise first (from €3,000/mo) — establishes the anchor
2. Highlight Professional as "Most Popular" (€599/mo) — Goldilocks effect
3. Include Sandbox (free) — proves confidence in the product
4. Annual discount (10%) — creates urgency without aggression

---

## Part 3: Strategic Timeline

| Phase | When | Action | Revenue Target |
|-------|------|--------|---------------|
| **Content positioning** | Feb → May 2026 | 2-3 SEO articles/week targeting "eIDAS 2.0 conformité", "KYC portefeuille identité". Build email list. | €0 (investment) |
| **MVP + consultancy niche** | May → Aug 2026 | Ship MVP. Target compliance consultancies FIRST. Get 5-10 paying customers. | €5K-15K MRR |
| **Panic window opens** | Aug → Dec 2026 | First EUDIWs go live. Fintechs scramble. Content traffic 10-50x spike. | €15K-50K MRR |
| **Private sector mandate** | 2027 | Banks, telecoms, healthcare MUST comply. Revenue acceleration. | €50K-200K MRR |

---

## Part 4: Key Lessons from Quentin Despas (MIM) Applied

| Lesson | Application to SSI-SAAS |
|--------|------------------------|
| "Les riches sont dans les niches" | Target French fintechs + compliance consultancies, NOT "all European SMEs" |
| Sell water to tourists in the desert | Wait for the panic wave (mid-2026) — position with content NOW |
| 3 PMF levers: product, target, message | **Change MESSAGE first** — stop saying "SSI", start saying "conformité eIDAS" |
| Concentric prospection | Sign 1 consulting firm → call all their competitors |
| Inbound + outbound | Content (inbound) starts NOW as compound interest. Outbound to consultancies at MVP. |
| Interview 10-20 prospects without selling | **CRITICAL NEXT ACTION** — schedule 10 discovery calls with fintech CTOs and compliance consultants |

---

## Part 5: Immediate Next Actions

1. **Schedule 10 discovery interviews** — 5 fintech CTOs/compliance officers + 5 compliance consultants. Objective: understand their problems, NOT sell. This is the single highest-ROI action.
2. **Publish first 5 SEO articles** — targeting "conformité eIDAS 2.0 fintech", "portefeuille identité numérique entreprise", "KYC eIDAS 2.0"
3. **Update PRD** — revise pricing tiers to new model, revise target market from "European SMEs" to "French fintechs + compliance consultancies"
4. **Continue BMAD workflow** — Architecture (CA) → Epics (CE) → Implementation Readiness (IR)
5. **Product name decision** — still blocking. Consider names that resonate with the NEW message (compliance, identity, trust) not the technical reality (SSI, VC, DID)

---

## Supporting Research Documents

- **Pricing Strategy Research (full):** `_bmad-output/planning-artifacts/research/pricing-strategy-research-2026-02-15.md`
- **Market Research (original):** `_bmad-output/planning-artifacts/research/market-ssi-eidas-vc-platform-research-2026-02-11.md`
- **Domain Research:** `_bmad-output/planning-artifacts/research/domain-eidas-ssi-platform-research-2026-02-10.md`
- **PRD:** `_bmad-output/planning-artifacts/prd.md`

---

**Document Status:** APPROVED (2026-02-16)
