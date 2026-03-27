# Manual Test Script

## Full FTUE test

1. Sign in with email magic link.
2. Complete household setup with `Benjamin` and `Camille`.
3. Verify the app moves into the category-led setup instead of the main dashboard.
4. Open `TV & entertainment` and choose `Netflix` or another common service.
5. Adjust the amount and payment date, then save it.
6. Stay in the FTUE and add one service from another category such as `Phone & internet` or `Cloud & AI`.
7. Continue to the dashboard.
8. Verify the cash-out timeline shows the saved renewal dates.
9. Open one saved subscription.
10. Mark it cancelled.
11. Verify it moved to `Cancelled subscriptions`.

## Optional connected-accounts test

1. Complete the FTUE first.
2. Open the connected accounts section on the dashboard.
3. Connect one institution.
4. Complete consent in the browser and return to the app.
5. Verify the callback completes the pending connection without manual API intervention.
6. Verify linked accounts appear under the institution row.
7. Sync the connection again.
8. Review at least one recurring candidate.
9. Confirm it as shared or personal.
10. Verify the confirmed subscription appears in the same dashboard loop as manual entries.

## What should be true

- auth is required before dashboard access
- household setup persists
- the second step of onboarding is category-first, not a blank manual form
- starter templates come prefilled with country-aware default price hints
- edited manual subscriptions affect dashboard totals and the cash-out timeline
- cancelled subscriptions no longer count as active recurring spend
- connected accounts remain read-only
- linked transactions only become subscriptions after explicit review
- revoked connections stop offering active sync actions

## Dev-only shortcuts

Dev-only shortcuts can still be enabled locally, but they are not part of the real app path:

- `EXPO_PUBLIC_ENABLE_DEV_TOOLS=true`
- `BANKING_PROVIDER_MODE=mock`
- `ENABLE_DEV_ROUTES=true`
