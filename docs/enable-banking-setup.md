# Enable Banking Setup

This repo now supports `Enable Banking` as the preferred real AIS provider spike.

Supported flow:

- institution discovery
- OAuth consent initiation
- callback completion
- linked account import
- transaction import
- recurring-candidate generation

The app remains `read-only`. Imported transactions still need review before they become subscriptions.

## Required environment variables

Set these in the repo root `.env`:

```bash
BANKING_PROVIDER_MODE=enablebanking
ENABLEBANKING_APPLICATION_ID=your_application_id
ENABLEBANKING_KEY_ID=your_key_id
ENABLEBANKING_PRIVATE_KEY_PATH=/absolute/path/to/private.pem
ENABLEBANKING_REDIRECT_URI=https://benpomme.github.io/orbit/open-banking/callback/
EXPO_PUBLIC_BANK_REDIRECT_URL=https://benpomme.github.io/orbit/open-banking/callback/
ENABLEBANKING_BASE_URL=https://api.enablebanking.com
```

You can use `ENABLEBANKING_PRIVATE_KEY` instead of `ENABLEBANKING_PRIVATE_KEY_PATH` if you prefer an inline PEM value.

## Key generation

Generate a PKCS8 RSA private key:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
```

Export the public key and upload it in the Enable Banking dashboard:

```bash
openssl rsa -pubout -in private.pem -out public.pem
```

## Redirect target

Enable Banking registration needs a real `https://` callback URL. This repo now includes a GitHub Pages bridge page at:

```bash
https://benpomme.github.io/orbit/open-banking/callback/
```

That page immediately redirects back into the native app using the `orbithousehold://open-banking/callback` deep link.

Use the same web callback target on both API and client:

```bash
ENABLEBANKING_REDIRECT_URI=https://benpomme.github.io/orbit/open-banking/callback/
EXPO_PUBLIC_BANK_REDIRECT_URL=https://benpomme.github.io/orbit/open-banking/callback/
```

GitHub Pages note:

1. Push the `docs/` folder changes to the `BenPomme/orbit` repository.
2. In GitHub repository settings, enable Pages from the `main` branch and `/docs` folder.
3. Wait for `https://benpomme.github.io/orbit/open-banking/callback/` to load before using it in Enable Banking.

## Local test path

1. Start the API: `pnpm dev:api`
2. Start the app: `pnpm dev:mobile` or `pnpm dev:web`
3. Sign in and complete household setup.
4. Open the connected accounts section.
5. Pick an institution and finish consent in the browser.
6. Return to the app and verify the callback completes the connection.
7. Verify linked accounts appear under the institution.
8. Review recurring candidates before confirming anything as a subscription.
