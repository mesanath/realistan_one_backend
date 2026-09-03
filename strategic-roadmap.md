# Realistan — Strategic Roadmap: Hard Problems We're Solving Next

**Companion to the [pitch deck](./pitch-deck.html), [HLD](./HLD.md) and [LLD](./LLD.md)** · Confidential

This document goes one level deeper than the deck's "Beyond the Next 2–3 Quarters" slide. Each item below is a real, unsolved problem — not a built feature described in future tense. Where a proposed approach references existing infrastructure, that infrastructure is genuinely live today (cited against the HLD/LLD); everything else is a plan, not a claim.

---

## 1. Cold-start agent supply — onboarding from directories like JustDial

**Problem.** Every two-sided services marketplace lives or dies on its supply side first. ServeEase needs a base of verified, reliable service professionals (electricians, plumbers, cleaners, etc.) in each city before the demand side has anything to book. Paid acquisition of individual providers is slow and expensive at pre-seed stage.

**Why it matters.** Directories like JustDial already aggregate a large pool of local service professionals per city and category — existing, if unverified and unmanaged, supply. Converting even a fraction of that into verified ServeEase agents would be dramatically cheaper than cold outbound recruiting, and doesn't require new backend work: the Agent onboarding and verification data model already exists (`Agent`, `AgentChangeRequest` — LLD §3) and the admin console already has a vetting workflow.

**Proposed approach — API/webhook partnership model, not scraping.** The intended path is a formal integration, not manual outreach or automated data collection off someone else's platform:
- Pursue a data-sharing or lead-partner API/webhook agreement directly with the directory (JustDial or equivalent local players), so provider records or inbound leads arrive through a sanctioned integration.
- Build a webhook receiver / sync job that ingests providers or leads from that API and feeds them straight into the existing ServeEase agent onboarding flow.
- Route every inbound provider through the current KYC/verification pipeline before they go live — no shortcuts on trust just to grow supply faster.

**Status.** Not started. The prerequisite is commercial/partnership, before it's an engineering task: no such API agreement exists yet, and one has to be negotiated with the directory before any integration work can begin.

**Open questions / risks.**
- This entire approach depends on the other side agreeing to share data via API — there's no guarantee a directory like JustDial will offer or agree to such a partnership, and no outreach or scraping of their listings is a substitute if they don't. Fallback (manual, compliant outreach) only re-enters the picture if a partnership isn't reachable.
- Commercial terms are unknown: revenue share, exclusivity, per-lead cost, or a flat data-licensing fee are all plausible structures — none assumed here.
- Incentive design on the provider side: why would a provider already getting leads from JustDial also want to list on ServeEase? (Likely answer: live tracking, digital payments, and dispute protection JustDial doesn't offer — needs validating with real providers, not assumed.)
- No cost-per-acquisition estimate exists yet — don't quote one until a real pilot cohort or partnership is running.

---

## 2. Legally verified properties and land listings

**Problem.** Real estate's core trust gap (named directly in the deck's Problem slide) is that a buyer has no way to verify a listing's legal status without hiring their own lawyer, and a seller with genuinely clean title has no way to signal it. This applies to properties and, separately and often messier, to land parcels.

**Why it matters.** Realistan already sells title search, litigation support, and valuation reports as a standalone real-estate-services suite (HLD §3). This problem reframes that existing service line as a trust *feature on the listing itself* — a "Verified" tier — rather than an ancillary upsell. That's a conversion and differentiation lever, not just a services revenue line.

**Proposed approach.**
- Define a documented verification checklist per listing type: title deed, encumbrance certificate, RERA registration where applicable, property tax receipts, litigation search.
- Surface verification status and the underlying document set clearly in the listing UI (badge + expandable evidence, not just a claim).
- Data model extension: a verification-status field and document attachments on the `properties` collection (LLD §3), plus an admin review queue.

**Status.** Not built. No verification SOP exists yet; no legal partner or in-house legal-ops process is confirmed.

**Open questions / risks.**
- Who actually performs verification — in-house legal/ops hires, or a third-party title-search vendor? Cost-per-verification and turnaround time are unknown until that's decided.
- Liability and disclaimer language needs real legal review — a "Verified" badge implies a standard of care that has to be backed by an actual process, not marketing copy.
- Land parcels (vs. built properties) often have materially messier title chains in India — may need a separate, more conservative verification standard rather than reusing the property checklist as-is.

---

## 3. RAG-based interest matching across both verticals

**Problem.** ServeEase already has a working AI recommender in production (LLD §6): Claude-based, using a customer's last 10 bookings plus up to 50 active services, cached in Redis. That's real and running — but it's a prompt-based recommender over a small, manually-scoped candidate set, not a retrieval system, and it doesn't yet reason over Realistan (property) signals at all.

**Why it matters.** This is the mechanism that makes "one platform" actually pay off rather than being an architecture slide. A user's real-estate search behavior (locality, budget, family-home vs. rental) is a strong signal for which home services they'll need next — and today nothing connects the two.

**Proposed approach.**
- Build a proper retrieval layer: embed property and service listings plus user interaction history (searches, saved items, bookings, chat transcripts once #4 exists) into a vector index.
- Elasticsearch 8 is already in the stack (HLD §4) and supports vector/kNN search — the likely first choice over adding a new vector database, to avoid adding infrastructure surface area unnecessarily.
- Retrieve semantically relevant candidates per user, then use an LLM to rank and explain the match (extending the existing recommender pattern rather than replacing it).

**Status.** Not built. Today's recommender is explicitly *not* a RAG system — it's a single prompt call over a pre-filtered candidate list. This is a genuine architecture upgrade, not a relabeling of what exists.

**Open questions / risks.**
- Latency and per-recommendation cost budget once retrieval is added on top of the existing LLM call.
- Cold-start for new users with no interaction history yet.
- No ground-truth evaluation set exists — there's no real traffic to measure match quality against, so early evaluation will have to be qualitative/manual.

---

## 4. Conversational chatbot for interest capture

**Problem.** Today, understanding what a user actually wants relies entirely on structured search filters. Users who don't know how to specify what they need (an unclear budget, an unfamiliar locality, a hard-to-categorize service need) fall through — there's no unstructured way to state intent and have the platform interpret it.

**Why it matters.** This is the natural companion to #3, not a separate initiative: a chat interface generates exactly the structured preference signal (budget, locality, timeline, service urgency) that a RAG matching system needs, while also lowering friction for undecided users at the top of the funnel.

**Proposed approach.**
- A chat interface built on the same Anthropic Claude integration already live in production (LLD §6) — a second, conversational entry point into the existing AI layer, not a new subsystem built from scratch.
- Extract structured intent from the conversation (property type/budget/locality/family size, or service type/urgency/recurrence) and feed it directly into search filters and/or the RAG matcher above.

**Status.** Not built.

**Open questions / risks.**
- Where the chat lives in the product (dedicated widget vs. woven into search) — a UX decision, not just an engineering one.
- Conversation state and session storage design.
- Escalation path to a human agent when the bot can't resolve ambiguity — needs to fail gracefully, the same way the current recommender degrades to an empty result on error (LLD §6) rather than a broken experience.

---

## How these four connect

\#1 and #2 are supply/trust problems — they make the marketplace itself more fillable and more trustworthy. #3 and #4 are demand-side intelligence problems, and #4 is a direct input to #3. None of the four depend on new infrastructure beyond what's already listed in the HLD/LLD (Elasticsearch, the Anthropic integration, the existing Agent and Property data models) — the ask is engineering time and, for #1 and #2, real operational/legal process design, not a new tech stack.

---

*Companion documents: [Pitch Deck](./pitch-deck.html) · [High-Level Design](./HLD.md) · [Low-Level Design](./LLD.md) · [Investor Readiness Checklist](./investor-checklist.md)*
