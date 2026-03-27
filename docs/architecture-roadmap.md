# Architecture And Roadmap

## Recommended Stack

### Mobile

- Expo + React Native + TypeScript
- secure session persistence later
- current local auth-token persistence is lightweight and intentionally minimal

### Backend

- Node.js + Fastify + TypeScript
- target persistence: PostgreSQL + Drizzle
- current local runtime: JSON-backed store with DB scaffolding already added

### Platform services

- email magic-link auth
- open-banking provider abstraction
- notification service later
- analytics and feature flags later

## Architectural Principles

1. Keep bank integrations behind a provider abstraction.
2. Treat imported transactions as evidence, not subscription truth.
3. Keep downstream product code on app-owned normalized records.
4. Make import and sync flows idempotent.
5. Make reconnect, expired consent, and review states first-class UX states.

## Current Architecture Shape

### Mobile app

- auth screen
- household onboarding and editing
- dashboard with manual and connected subscription management
- bank-link entry point and sync controls
- recurring-candidate review
- subscription detail and cancellation loop

### API

- auth/session service
- household service
- subscription service
- banking provider adapter layer
- recurring-candidate engine
- optimization service

### Data model direction

- users
- households
- household_members
- memberships
- sessions
- subscriptions
- bank_connections
- bank_accounts
- bank_transactions
- recurring_candidates
- candidate_reviews
- merchant_aliases
- subscription_source_links

## Open Banking Strategy

### Current decision

- current preferred production spike: `Enable Banking`
- fallback/secondary provider: `GoCardless Bank Account Data`
- current implementation also ships a `mock` provider for free local validation
- scope: `AIS only`
- not in scope: payment initiation, VRP, premium enrichment dependency

### Connector operating model

- explicit consent and connection records
- normalized app-owned account and transaction records
- idempotent sync per connection
- provider-native IDs stored only for sync and reconciliation
- candidate review required before subscription creation

## Recurring Detection Strategy

1. normalize merchant names
2. group transactions by merchant
3. infer cadence from date spacing
4. score amount stability
5. boost confidence on country-catalog matches
6. emit recurring candidates
7. require confirm, reject, or merge review actions

## Current Runtime Caveat

The repo now contains:

- Drizzle config
- PostgreSQL client scaffolding
- initial schema definitions

But the working local app still persists to `apps/api/data/store.json`. That is intentional while the auth, banking, and candidate contracts stabilize. The DB cutover is the next backend infrastructure milestone, not a blocker for the product loop.

## Delivery Roadmap

### Phase 0: Strategy and manual vertical slice

- validate product thesis
- ship manual household flow
- prove dashboard, cancellation loop, and country catalog

### Phase 1A: Auth and household identity

- email magic-link auth
- authenticated user and member resolution
- household-backed session model
- share-code-based join semantics on top of auth

Status: in progress and locally working

### Phase 1B: Database cutover

- move runtime storage from JSON to Postgres
- apply Drizzle schema and migrations
- seed a local demo household deterministically
- preserve current API contracts during storage migration

Status: scaffolded, not cut over

### Phase 1C: Provider abstraction and real AIS connectors

- normalized banking provider interface
- mock provider for deterministic local tests
- Enable Banking implementation for real OAuth/session-based AIS flows
- GoCardless implementation retained as a secondary adapter
- institution lookup, connection creation, callback completion, account listing, sync, and disconnect routes

Status: local mock working, Enable Banking and GoCardless adapters scaffolded, callback/account routes added

### Phase 1D: Recurring-candidate engine and review queue

- recurring inference from transactions
- candidate review actions
- confirmed candidate creation into subscriptions
- candidate rejection and merge behavior

Status: working locally

### Phase 1E: Optimization from confirmed bank-linked subscriptions

- derive savings actions from confirmed state
- improve duplicate detection
- attach evidence and recommendation ranking

Status: partial, needs iteration

### Phase 2: Production-hardening

- Postgres runtime adoption
- proper auth email delivery
- connector consent lifecycle and reconnect UX
- API tests and stronger end-to-end coverage

### Phase 3: Cancellation engine and merchant intelligence

- merchant playbook knowledge base
- downgrade and switch recommendations
- cancellation guidance and outcome tracking
- local logo/merchant asset pipeline

## Multi-Agent Execution Split

### Agent A: Auth + persistence

- finish DB cutover
- keep auth/session contracts stable
- add membership authorization tests

### Agent B: Banking adapter

- harden Enable Banking integration
- keep GoCardless as alternate provider
- add consent-state handling
- improve account and transaction persistence

### Agent C: Recurring intelligence

- improve merchant normalization
- reduce false positives
- add merge and suppression behavior

### Agent D: Mobile connected UX

- improve bank-link and candidate-review flows
- tighten state handling for errors, empty states, and reconnect
- preserve manual-first usability

### Agent E: QA and release

- expand API tests
- expand browser smoke
- support iOS preview build and device validation
