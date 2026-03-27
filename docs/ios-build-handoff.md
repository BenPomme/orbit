# iOS Build Handoff

## Purpose

Use this brief when another agent is operating in Xcode or on a Mac with iOS simulator access. The goal is to get from the current Expo-managed repo state to a testable iOS vertical slice without rediscovering the workflow.

## Current Product Slice

The build should already support this flow:

1. launch the app
2. complete first-run household setup with member names
3. switch between Spain and France catalogs
4. use merchant autocomplete or a popular suggestion to prefill the add form
5. save a subscription
6. open subscription detail
7. mark the subscription cancelled
8. confirm the dashboard updates
9. switch the active household member on the dashboard to confirm the shared-account model

## Before Running Anything

1. From the repo root, install dependencies:

```bash
pnpm install
```

2. Start the API in one terminal:

```bash
pnpm dev:api
```

3. Confirm the API is live:

```bash
curl http://127.0.0.1:4000/health
```

4. Reset the demo household to the onboarding state if needed:

```bash
curl -X PATCH http://127.0.0.1:4000/v1/household \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pommeraud Household","country":"ES","isSetupComplete":false,"members":["Benjamin","Partner"]}'
```

## Fastest iOS Validation Path

For simulator validation, stay in Expo managed mode first.

1. Start Expo from the repo root:

```bash
pnpm dev:mobile
```

2. In the Expo terminal UI, press `i` to launch the iOS simulator.

3. Walk the acceptance flow:

```text
Set up household -> enter member names -> choose FR -> continue -> verify France catalog
Switch catalog back to ES -> type "Net" in merchant field
Tap the Netflix autocomplete suggestion -> verify merchant/category prefill
Create a subscription -> open detail -> mark cancelled -> return to dashboard
Switch active member in the member-session card
```

4. Record:
   - simulator screenshots for onboarding, dashboard, detail
   - any layout issues around safe areas, keyboard overlap, or clipped content
   - any network failure or state-persistence issue

## EAS Preview Build Path

Use this when Expo auth and Apple-side credentials are available.

1. Log in:

```bash
eas login
```

2. Build a simulator artifact first:

```bash
eas build --platform ios --profile preview-simulator
```

3. If that succeeds, install/run the latest simulator build:

```bash
eas build:run --platform ios --latest
```

4. For an internal device build instead of simulator:

```bash
eas build --platform ios --profile preview
```

Current repo config expectations:

- bundle identifier: `com.orbithousehold.app`
- Expo app name: `Orbit Household`
- EAS config file: `eas.json`

## When To Use Xcode

Only drop into Xcode if simulator behavior in Expo is not enough, or if native signing/build troubleshooting is needed.

If native project generation is required:

```bash
cd apps/mobile
npx expo prebuild -p ios
xed ios
```

Important:

- do not commit the generated `ios/` directory unless the product is intentionally moving away from managed Expo
- prefer fixing product and layout issues in the Expo codepath first

## Acceptance Checklist

- onboarding is shown on a clean household state
- household name, country, and member names persist after continuing
- France catalog shows France-specific templates
- switching to Spain updates the catalog
- household member cards are visible on the dashboard
- active household member is shown and can be switched from the dashboard
- typing in the merchant field shows autocomplete suggestions
- selecting a suggestion prefills merchant and category
- saving a subscription updates live monthly spend
- opening detail allows cancellation
- cancelled subscriptions move out of the active count

## Useful Repo Commands

```bash
pnpm --filter api typecheck
pnpm --filter mobile typecheck
pnpm --filter api build
python3 scripts/verify_mobile_web.py
```

The web smoke test already validates onboarding, catalog switching, autocomplete, add, detail, and cancel behavior. Use simulator testing to catch the iPhone-specific issues the browser flow cannot see.
