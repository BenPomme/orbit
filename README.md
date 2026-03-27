# Subscription Manager

Europe-focused household subscription manager, starting with Spain and France.

## Repo map

- `docs/market-research.md`: market opportunity and competitive whitespace
- `docs/prd.md`: product strategy and current scope
- `docs/architecture-roadmap.md`: architecture decisions and phased roadmap
- `docs/ios-vertical-slice-roadmap.md`: path to a testable iOS build
- `docs/ios-build-handoff.md`: simulator/Xcode/EAS handoff notes
- `docs/manual-test-script.md`: fastest manual test path for the current connected slice
- `docs/enable-banking-setup.md`: Enable Banking setup for the preferred real AIS spike
- `docs/gocardless-bank-data-setup.md`: GoCardless Bank Account Data setup notes
- `docs/ui-ux-spec.md`: UI and UX direction
- `apps/mobile`: Expo mobile app for iOS, Android, and web
- `apps/api`: Fastify API for auth, household state, banking sync, and recurring review

## Current product slice

The app now supports:

- email magic-link auth in dev mode
- shared household setup from first launch
- category-led FTUE after household setup
- active-member switching inside one household
- manual subscription CRUD with country-aware popular templates
- Spain and France category catalog with common providers and starter price points
- fast add flows for TV and entertainment, phone and internet, banking, sports and gym, cloud and AI, gaming, news and learning, and custom services
- banking provider abstraction with `Enable Banking`, `GoCardless`, and `mock`
- connected-account sync for read-only AIS flows
- provider callback completion, linked-account listing, and disconnect flow
- recurring-candidate generation from bank transactions
- candidate review into confirmed subscriptions
- dashboard totals, cash-out timeline, and cancellation flow

Important runtime note:

- the delivery plan is `Postgres + Drizzle`
- the repo already contains Drizzle schema and DB scaffolding
- the live local runtime still uses the JSON store in `apps/api/data/store.json` until the DB cutover is finished

## Quick start

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

For native Expo:

```bash
pnpm dev:mobile
```

If you need a device to hit the local API:

```bash
EXPO_PUBLIC_API_URL=http://YOUR-MACHINE-IP:4000 pnpm dev:mobile
```

## Environment

Copy from `.env.example` and set what you need.

The root `pnpm dev:*` commands now load variables from the repo root `.env` automatically.

Relevant variables:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_ENABLE_DEV_TOOLS`
- `EXPO_PUBLIC_BANK_REDIRECT_URL`
- `DATABASE_URL`
- `BANKING_PROVIDER_MODE`
- `ENABLEBANKING_APPLICATION_ID`
- `ENABLEBANKING_KEY_ID`
- `ENABLEBANKING_PRIVATE_KEY`
- `ENABLEBANKING_PRIVATE_KEY_PATH`
- `ENABLEBANKING_REDIRECT_URI`
- `ENABLEBANKING_BASE_URL`
- `GOCARDLESS_ACCESS_TOKEN`
- `GOCARDLESS_SECRET_ID`
- `GOCARDLESS_SECRET_KEY`
- `GOCARDLESS_REDIRECT_URL`
- `GOCARDLESS_BANK_DATA_BASE_URL`
- `ENABLE_DEV_ROUTES`

Production-shaped defaults:

- `BANKING_PROVIDER_MODE=unconfigured`
- no mock banking unless you explicitly opt into `BANKING_PROVIDER_MODE=mock`
- no dev reset route unless `ENABLE_DEV_ROUTES=true`
- no demo shortcuts in the mobile UI unless `EXPO_PUBLIC_ENABLE_DEV_TOOLS=true`

For real Enable Banking connections, set:

- `BANKING_PROVIDER_MODE=enablebanking`
- `ENABLEBANKING_APPLICATION_ID`
- `ENABLEBANKING_KEY_ID`
- either `ENABLEBANKING_PRIVATE_KEY` or `ENABLEBANKING_PRIVATE_KEY_PATH`
- `ENABLEBANKING_REDIRECT_URI`
- `EXPO_PUBLIC_BANK_REDIRECT_URL`

For real GoCardless connections, set:

- `BANKING_PROVIDER_MODE=gocardless`
- either `GOCARDLESS_ACCESS_TOKEN` or the pair `GOCARDLESS_SECRET_ID` + `GOCARDLESS_SECRET_KEY`
- `GOCARDLESS_REDIRECT_URL`
- optionally `EXPO_PUBLIC_BANK_REDIRECT_URL` if the client should explicitly pass the same redirect target

There is no fallback fake redirect anymore. The bank-connect flow now fails closed until these are configured.

Use the same real callback target on both sides. For native testing that can be your app deep link, for example `orbithousehold://open-banking/callback`. For hosted environments, use a web callback you control.

## API surface

Auth:

- `POST /auth/request-link`
- `POST /auth/verify`
- `GET /auth/session`
- `POST /auth/signout`

Household and subscriptions:

- `GET /v1/household`
- `PATCH /v1/household`
- `GET /v1/session`
- `PATCH /v1/session`
- `GET /v1/subscriptions`
- `POST /v1/subscriptions`
- `PATCH /v1/subscriptions/:id`
- `DELETE /v1/subscriptions/:id`
- `GET /v1/opportunities`
- `GET /v1/catalog/popular`

Banking and recurring review:

- `GET /v1/banking/institutions`
- `POST /v1/banking/connect`
- `POST /v1/banking/complete`
- `GET /v1/banking/connections`
- `GET /v1/banking/accounts`
- `POST /v1/banking/sync`
- `DELETE /v1/banking/connections/:id`
- `GET /v1/recurring-candidates`
- `POST /v1/recurring-candidates/:id/review`

Dev-only reset:

- `POST /debug/reset`

## Validation

```bash
pnpm typecheck
pnpm build
python3 scripts/verify_mobile_web.py
```

The smoke script assumes:

- API on `http://127.0.0.1:4000`
- Expo web on `http://127.0.0.1:8082` by default

Override the web URL if needed:

```bash
WEB_BASE=http://127.0.0.1:19006 python3 scripts/verify_mobile_web.py
```

## iOS build path

The repo is config-ready for Expo/EAS preview builds.

Next command once Expo/EAS auth is available:

```bash
eas build --platform ios --profile preview
```
