# KD Design: Live Virtual Try-On demo

Branch: `demo/decart-live-tryon`. Based on `feature/customer-membership-sprint-2`; do not merge automatically. No database changes or seed required.

## Update and run

Preserve any local edits before switching branches (commit them or use `git stash push -u`). Never reset or clean your working tree to install this demo.

```powershell
cd D:/KD-Design-Starter/KD-Design-Starter
git status
git fetch origin
git switch demo/decart-live-tryon
git pull --ff-only origin demo/decart-live-tryon
npm ci
npm run dev:api
```

If the local branch does not exist, use `git switch --track origin/demo/decart-live-tryon` instead. In another terminal in the same folder:

```powershell
npm run dev:store
```

## Private server configuration

Create a key in https://platform.decart.ai under API Keys. Check credits and Lucy Virtual Try-On access there. Never paste the key into chat. Add these settings to your existing **server/.env** locally or your deployment secret manager; preserve your existing database/JWT settings:

```dotenv
TRY_ON_ENABLED=true
DECART_API_KEY=REPLACE_LOCALLY_WITH_PRIVATE_KEY
# Optional, only if your Decart account can sustain longer sessions (30-300 seconds):
TRY_ON_SESSION_SECONDS=120
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Do not commit .env, put this key in VITE_* / frontend / localStorage, or log it. Restart the API after changes. Production origins must be exact HTTPS origins (no trailing slash). Camera access requires HTTPS or localhost; a plain LAN HTTP URL on a phone is insufficient.

To disable: set `TRY_ON_ENABLED=false` and restart the API. New tokens will be refused; existing sessions remain bounded by the configured provider cap. The default is 30 seconds for cost safety; `TRY_ON_SESSION_SECONDS` can be set to an integer between 30 and 300 seconds (for example 120). Increasing it can increase paid GPU usage and cannot override your provider/account limits.

## Try the integrated experience

1. Sign in to KD Design, open a product with photos and choose a color.
2. Click **TRY ON LIVE**. The selected color's image is passed to `/try-on`; otherwise the first product photo is used. Sign in before opening the link to preserve this selection.
3. Use the product photo, a clearly labelled Anywear sample, or upload JPG/PNG/WebP up to 5 MB.
4. Read the consent text and actively press Start. Only then is camera access requested and a token minted. Camera and garment media go directly to Decart, not the KD database. No microphone is requested.
5. Compare **Original camera** and **AI try-on**. Change garments without starting another session. Stop turns off all local camera tracks. Hidden tabs, page exit and unmount stop the trial too.

The feature never fakes AI success. An absent key/disabled feature, camera denial, expired login, invalid origin, provider refusal or network failure is shown in the fitting room. The UI marks Live only when an AI video track has arrived and the browser reports playback started. It exposes safe connection diagnostics without showing client tokens or camera images.

## API / SDK contract

Official SDK pinned to `@decartai/sdk@0.2.14`, model `lucy-vton-3.6`, standard speed. Rechecked against official documentation on 2026-11-04:

- https://docs.platform.decart.ai/getting-started/client-tokens
- https://docs.platform.decart.ai/models/realtime/virtual-try-on
- https://docs.platform.decart.ai/sdks/javascript-realtime

Authenticated `GET /api/try-on` returns configuration readiness only; it does not prove credits/model entitlement. Authenticated `POST /api/try-on` creates a token with a bounded TTL of `max(60, sessionSeconds + 30)`, one allowed model, the validated request Origin and `constraints.realtime.maxSessionDuration` equal to the server-configured cap (30-300 seconds). Token expiry does not end an existing session; the separate provider constraint does. A local wall-clock countdown begins before connection and is not reset on stream updates.

Responses: 401 expired/missing session; 403 blocked account or invalid/missing origin; 429 account cooldown; 503 disabled or missing key; 502 provider failure, with safe `providerStatus` when available. The permanent key and raw provider error bodies are never returned. Rate limiting is a single-process 30-second per-user cooldown; use a shared store and account-level spending limits before a multi-instance/public rollout.

Up to two automatic connect retries and at most 15 seconds of Decart capacity waiting are allowed. The SDK's `onCapacityWait` reports wait time but not a queue position. On established-session reconnect intent, the UI invalidates the attempt and disconnects rather than starting an unchecked new billing session. One token request is cached per explicit Start; credential callbacks after cancellation are rejected.

SDK 0.2.14 does not expose AbortSignal on realtime.connect. Stop immediately stops camera tracks and aborts the token request; if connect is already pending, its eventual result is disconnected and another Start is blocked until it settles. Provider-side signaling may persist until that settlement or the provider cap. This is not a promise of immediate billing cancellation during a pending handshake.

## Verification

```sh
npm test
npm run build
node --test tests/try-on.test.js tests/try-on-browser.test.js
```

Provider tests use stubs (no API key/credits). They cover token restrictions, missing config/origin, cooldown, 401/402/403/429/500 provider failures without secret disclosure, and the existing account authorization middleware (missing/expired/blocked/revoked sessions).

Browser fixture uses canvas streams and an injected SDK only in the test harness. It covers consent, denied/late camera permission, Stop during pending connect, late session cleanup, garment change, invalid upload, hidden tab, page exit, unmount, local expiry and layout at 360/390/768/1024/1440px. Linux Chrome runner is used in CI. No actual customer photos or credentials are used in tests. The browser explicitly tests that the AI display transitions to Live only after a video playback event. Live Decart connectivity, the actual uplink bitrate and rendered output must still be verified manually on a real camera/network.

Manual checks still required with the owner's explicit permission and funded key: real Decart model entitlement/credits errors, output quality, provider-enforced cutoff, mobile Safari/Android camera behavior, and product-image CORS. If a product image cannot be fetched cross-origin, upload a garment file instead. Do not add an arbitrary server-side image proxy.

The AI preview is not a physical fit/size guarantee. Existing Anywear sample assets are reused for this demo; verify licensing before a public commercial rollout.
