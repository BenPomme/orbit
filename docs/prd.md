# Product Requirements Document

## Product Thesis

Build the best mobile product in Europe for households to understand, control, and optimize recurring spend.

This is not a generic budgeting app with a subscriptions tab. It is a recurring-spend operating layer for couples and families that need three things in one place:

- household visibility
- trustworthy subscription detection
- explainable savings actions

## Target Users

### Primary

- couples and families in Spain and France
- households with 8+ recurring subscriptions across streaming, telecom, utilities, education, and apps
- users who already feel recurring-spend fatigue and want practical control, not financial theory

### Secondary

- single professionals with heavy digital-service usage
- expatriate or multi-account households
- users who want early alerts before renewals, trial conversion, or overspending

## Value Proposition

For European households overwhelmed by recurring charges, the product provides one shared mobile control center to:

- track manual subscriptions fast
- connect bank accounts on a read-only basis
- detect likely recurring payments
- confirm what is real before it affects the dashboard
- surface localized savings actions the household can actually take

## Product Principles

1. Start with trust and explainability.
2. Treat bank-imported signals as candidates until reviewed.
3. Keep manual entry first-class even when no bank is connected.
4. Make household collaboration explicit from day one.
5. Never overclaim cancellation capability or bank permissions.

## Free Open-Banking Position

The next product differentiator is `free connected detection`, not paid enrichment.

Current product stance:

- preferred provider for the real spike: `Enable Banking`
- secondary provider path: `GoCardless Bank Account Data`
- scope: `read-only AIS`
- supported outcome: institutions, balances, transactions, recurring inference
- deferred: paid enrichment, payment initiation, universal cancellation automation

This matters because the product can validate real demand for connected detection without carrying enrichment or payments cost before the retention loop is proven.

## MVP Shape

### Included

- email magic-link auth
- household creation and shared-member structure
- FTUE flow: household setup, then category-led subscription intake
- manual subscription CRUD
- Spain and France popular-subscription templates with logos
- bank-linked transaction ingestion through a provider abstraction
- recurring-candidate generation from imported transactions
- candidate review: confirm, reject, merge, assign owner
- dashboard totals, renewals, and optimization opportunities
- cancellation-state tracking

### Explicitly out for this phase

- payment initiation
- premium enrichment dependency
- in-app direct cancellation for every merchant
- full budgeting/PFM replacement workflows
- investments, debt, taxes, or broad financial planning

## Core Jobs To Be Done

- “Show me every recurring payment I’m likely committed to.”
- “Let both adults manage this in one household account.”
- “Tell me what is confirmed versus only inferred.”
- “Point me to savings actions I can trust.”
- “Help me mark something cancelled and keep the dashboard honest.”

## FTUE Shape

The first-run experience should be extremely simple:

1. set up the household
2. add the first subscriptions by category
3. land on a dashboard that answers when money leaves the account

Initial category system:

- TV and entertainment
- phone and internet
- banking
- sports and gym
- cloud and AI
- gaming
- news and learning
- other

Each category should:

- show the most common providers in the selected country
- include a starter price point or price range
- let the household edit amount, owner, and payment date before saving

## Functional Requirements

### FR1: Household identity

- Every action is tied to an authenticated user and household member.
- A household can include multiple members with personal and shared ownership.
- Invite and join flows use a share-code product metaphor, but membership is auth-backed.

### FR2: Subscription inventory

- Track merchant, category, amount, cadence, currency, next renewal, owner, status, confidence, and source evidence.
- Support manual and bank-confirmed subscriptions in the same dashboard.

### FR3: Connected detection

- Connect bank institutions through a provider abstraction.
- Support provider callback completion and reconnect flows without leaking provider-native payloads into the mobile app.
- Import accounts, balances, and transactions with explicit consent.
- Generate recurring candidates with confidence scoring.
- Never convert imported data directly into subscriptions without review.

### FR4: Candidate review

- Confirm a candidate as a new subscription.
- Merge a candidate into an existing tracked subscription.
- Reject a candidate as non-subscription noise.
- Assign candidate ownership as personal or shared.

### FR5: Optimization engine

- Detect likely over-tiered plans against the local merchant catalog.
- Surface duplicate and billing-cycle opportunities over time.
- Keep recommendations explainable with linked subscription evidence.

### FR6: Control loop

- Let the household edit, cancel, restore, or delete subscriptions.
- Keep renewal timeline and totals aligned with current state.

## Non-Functional Requirements

- GDPR-first consent and deletion posture
- resilient connector abstraction
- explainable classification logic
- auditable review actions
- localization for language, dates, and euro pricing

## Monetization Direction

### Free

- manual tracking
- shared household basics
- basic bank-linked recurring detection review
- renewal reminders baseline

### Premium later

- deeper collaboration controls
- richer savings intelligence
- alerting depth
- premium cancellation assistance and merchant workflows

## KPIs

### Activation

- percentage of households adding or confirming at least 5 subscriptions in week 1
- percentage of households completing auth + household setup
- percentage of households linking at least 1 bank account once the connector is available

### Retention

- 30-day retained households
- households reviewing at least 1 candidate per month
- households taking at least 1 management or optimization action per month

### Value

- confirmed monthly recurring spend tracked
- average savings identified
- average savings realized
- connected-account attach rate

## Release Criteria For The Connected MVP

- auth-backed household flow works end to end
- manual subscription path remains usable without bank connection
- at least one free AIS provider works in local/dev flows
- imported recurring candidates are reviewable before affecting dashboard truth
- confirmed candidates appear in the same management loop as manual subscriptions
- the iOS/web vertical slice is stable enough for pilot testing in Spain and France
