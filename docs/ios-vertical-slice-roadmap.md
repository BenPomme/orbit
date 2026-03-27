# iOS Vertical Slice Roadmap

## Goal

Ship a testable iOS build that proves one complete household journey:

1. open the app on iPhone
2. sign in with email magic link
3. join or create the household
4. finish household setup
5. add a subscription manually or from the popular catalog
6. connect a bank account
7. review a recurring candidate
8. see the confirmed subscription on the dashboard
9. mark a subscription cancelled
10. confirm totals and renewal state update correctly

This is the first real connected vertical slice. It must work even if no bank is connected, but it must also prove that connected detection can slot into the same management loop.

## Current State

Already built:

- auth screen with dev magic-link verification
- household onboarding and editing
- active-member switching inside one household
- Spain and France popular-subscription templates with autocomplete
- manual subscription create, edit, cancel, restore, and delete
- connected accounts section in the dashboard
- mock-bank sync and recurring-candidate review flow
- Enable Banking and GoCardless adapters scaffolded for real AIS work
- browser smoke that covers auth, onboarding, connected review, manual add, and cancellation

Still missing before a true installable iOS preview is complete:

- proper native-safe token persistence
- iPhone-specific keyboard and safe-area polish
- real native preview build execution through Expo/EAS
- production auth email delivery
- Postgres runtime cutover

## Definition Of Done

The first connected iOS slice is done when a tester can install an iOS build and complete this scenario without developer intervention:

1. launch the app
2. request and verify a magic link
3. complete household setup for Spain or France
4. see market-aware popular suggestions
5. add a manual subscription
6. connect a sandbox or mock bank
7. confirm a recurring candidate into a subscription
8. see dashboard totals update
9. open a subscription detail screen
10. mark it cancelled and return to a truthful dashboard

## Milestones

### Milestone 0: Contract lock

Output:

- exact connected vertical-slice journey
- stable route and state contract
- deterministic smoke coverage

### Milestone 1: Auth-first entry

Output:

- email magic-link sign-in
- auth-backed household session
- share-code join semantics

Exit criteria:

- the app no longer assumes anonymous household access

### Milestone 2: Manual household loop

Output:

- first-run household setup
- country-specific catalog
- manual add and manage flow

Exit criteria:

- the app remains fully usable without bank connection

### Milestone 3: Connected detection loop

Output:

- linked account entry point
- sync state
- recurring-candidate review
- confirmed candidate visible in subscriptions

Exit criteria:

- connected data can influence the dashboard only through review

### Milestone 4: iPhone usability pass

Output:

- safe-area audit
- keyboard handling audit
- scrolling and CTA visibility audit
- copy pass on auth and review flows

### Milestone 5: Testable preview build

Output:

- Expo/EAS preview build runs
- tester checklist exists
- build handoff is documented for Xcode-side execution

## Track Breakdown

### Track A: Mobile

1. keep auth/bootstrap stable on iOS
2. harden connected-account UX states
3. improve recurring-review detail flow
4. make error states less generic

### Track B: API

1. preserve auth and banking contracts
2. finish Postgres cutover behind the current routes
3. harden sync idempotency
4. add API-level tests for auth and candidate review

### Track C: QA

1. keep typechecks and build green
2. keep smoke deterministic with store reset
3. add iPhone simulator checklist
4. validate on real iPhone dimensions

## Acceptance Criteria

### API

- protected routes reject unauthenticated access
- mock or sandbox bank sync produces recurring candidates
- confirmed candidates create subscriptions
- confirmed subscriptions are reflected in dashboard totals

### Mobile

- auth flow is understandable without docs
- setup and manual add flow work on iPhone
- connected accounts and recurring candidates are visible and actionable
- cancellation state remains truthful after connected and manual actions mix

### QA

- `pnpm typecheck` passes
- `pnpm build` passes
- `python3 scripts/verify_mobile_web.py` passes
- iOS simulator session can complete the vertical slice manually

## Immediate Next Work

1. replace lightweight token storage with a native-safe persistence path
2. complete Postgres runtime cutover
3. validate the auth flow on native iPhone simulator and device
4. run an Expo/EAS preview build
