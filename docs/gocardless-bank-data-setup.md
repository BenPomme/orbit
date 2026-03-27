# GoCardless Bank Data Setup

## What is required

This app uses `GoCardless Bank Account Data` for free read-only AIS:

- institution discovery
- consent / requisition creation
- account import
- transaction import

There are two separate pieces of setup:

1. `GoCardless CLI sandbox auth`
2. `Bank Account Data API credentials`

The CLI is useful for sandbox access and general GoCardless developer tooling, but the app's bank-data adapter still needs Bank Account Data API auth.

You can provide that auth in either of these ways:

- `GOCARDLESS_ACCESS_TOKEN`
- or `GOCARDLESS_SECRET_ID` + `GOCARDLESS_SECRET_KEY`

## Required environment variables

Set these before testing a real bank-link flow:

- `GOCARDLESS_ACCESS_TOKEN` or `GOCARDLESS_SECRET_ID` + `GOCARDLESS_SECRET_KEY`
- `GOCARDLESS_SECRET_ID`
- `GOCARDLESS_SECRET_KEY`
- `GOCARDLESS_REDIRECT_URL`
- `EXPO_PUBLIC_BANK_REDIRECT_URL`

Use the same callback target for both redirect variables.

Example native callback:

```bash
GOCARDLESS_ACCESS_TOKEN=your_bank_data_access_token
GOCARDLESS_REDIRECT_URL=orbithousehold://open-banking/callback
EXPO_PUBLIC_BANK_REDIRECT_URL=orbithousehold://open-banking/callback
```

## CLI login

The official CLI is installed locally at:

```bash
$HOME/.local/bin/gocardless
```

Start sandbox login with:

```bash
$HOME/.local/bin/gocardless login
```

That opens the sandbox OAuth flow in the browser.

Important: the CLI sandbox token is not the same thing as a Bank Account Data API token. A successful `gocardless login` does not authorize requests to `bankaccountdata.gocardless.com`.

## Bank Account Data credentials

After CLI login, get the Bank Account Data API credentials from the GoCardless Bank Account Data developer portal user secrets area and put them into the environment above.

If you already have a valid Bank Account Data access token, you can skip the secret bootstrap and set `GOCARDLESS_ACCESS_TOKEN` directly.

Without a direct access token or valid secrets, the API will stay in `unconfigured` mode and the app will not create real bank requisitions.

## Real test flow

1. Start the API with either `GOCARDLESS_ACCESS_TOKEN` or the GoCardless secrets, plus the redirect URL.
2. Start the mobile app with the same callback target exposed as `EXPO_PUBLIC_BANK_REDIRECT_URL`.
3. Sign in.
4. Open `Connected accounts`.
5. Pick a supported institution.
6. Complete bank consent in the browser.
7. Return to the app.
8. Tap `Refresh` on the pending connection.
9. Review imported recurring candidates before confirming any as subscriptions.
