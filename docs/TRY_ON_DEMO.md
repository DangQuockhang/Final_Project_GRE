# KD Design: Live Virtual Try-On demo

Integrated into `feature/customer-membership-sprint-2` with owner approval on 2026-11-06. Backup: `backup/before-live-tryon-2026-11-06` at `4d498f5d765a4716967348a9b8c0debb98613599`. No database changes or seed required.

## Update and run

Preserve any local edits before switching branches (commit them or use `git stash push -u`). Never reset or clean your working tree to install this demo.

```powershell
cd D:/KD-Design-Starter/KD-Design-Starter
git status
git fetch origin
git switch feature/customer-membership-sprint-2
git pull --ff-only origin feature/customer-membership-sprint-2
npm ci
npm run dev:api
```

If the local branch does not exist, use `git switch --track origin/feature/customer-membership-sprint-2` instead. In another terminal in the same folder:

```powershell
npm run dev:store
```

## Private server configuration

Create a key in https://platform.decart.ai under API Keys. Check credits and Lucy Virtual Try-On access there. Never paste the key into chat. Add these settings to your existing **server/.env** locally or your deployment secret manager; preserve your existing database/JWT settings:

```dotenv
TRY_ON_ENABLED=true
DECART_API_KEY=REPLACE_LOCALLY_WITH_PRIVATE_KEY
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Do not commit .env, put this key in VITE_* / frontend / localStorage, or log it. Restart the API after changes. Production origins must be exact HTTPS origins (no trailing slash). Camera access requires HTTPS or localhost; a plain LAN HTTP URL on a phone is insufficient.

To disable: set `TRY_ON_ENABLED=false` and restart the API. New tokens will be refused; existing sessions remain bounded by the provider's 30-second cap.

## Try the integrated experience

1. Sign in to KD Design, open a product with photos and choose a color.
2. Click **TRY ON LIVE**. The selected color's image is passed to `/try-on`; otherwise the first product photo is used. Sign in before opening the link to preserve this selection.
3. Use the product photo, a clearly labelled Anywear sample, or upload JPG/PNG/WebP up to 5 MB.
4. Read the consent text and actively press Start. Only then is camera access requested and a token minted. Camera and garment media go directly to Decart, not the KD database. No microphone is requested.
5. Compare **Original camera** and **AI try-on**. Change garments without starting another session. Stop turns off all local camera tracks. Hidden tabs, page exit and unmount stop the trial too.

The feature never fakes AI success. An absent key/disabled feature, camera denial, expired login, invalid origin, provider refusal or network failure is shown in the fitting room. Only a remote video stream produces the live state.

## API / SDK contract

Official SDK pinned to `@decartai/sdk@0.2.14`, model `lucy-vton-3.6`, standard speed. Rechecked against official documentation on 2026-11-04:

- https://docs.platform.decart.ai/getting-started/client-tokens
- https://docs.platform.decart.ai/models/realtime/virtual-try-on
- https://docs.platform.decart.ai/sdks/javascript-realtime

Authenticated `GET /api/try-on` returns configuration readiness only; it does not prove credits/model entitlement. Authenticated `POST /api/try-on` creates a token with `expiresIn:60`, one allowed model, the validated request Origin and `constraints.realtime.maxSessionDuration:30`. Token expiry does not end an existing session; the separate provider constraint does. A local wall-clock countdown begins before connection and is not reset on stream updates.

Responses: 401 expired/missing session; 403 blocked account or invalid/missing origin; 429 account cooldown; 503 disabled or missing key; 502 provider failure, with safe `providerStatus` when available. The permanent key and raw provider error bodies are never returned. Rate limiting is a single-process 30-second per-user cooldown; use a shared store and account-level spending limits before a multi-instance/public rollout.

No automatic connect retries or capacity retries. On reconnect intent, the UI invalidates the attempt and disconnects. One token request is cached per explicit Start; credential callbacks after cancellation are rejected.

SDK 0.2.14 does not expose AbortSignal on realtime.connect. Stop immediately stops camera tracks and aborts the token request; if connect is already pending, its eventual result is disconnected and another Start is blocked until it settles. Provider-side signaling may persist until that settlement or the provider cap. This is not a promise of immediate billing cancellation during a pending handshake.

## Verification

```sh
npm test
npm run build
node --test tests/try-on.test.js tests/try-on-browser.test.js
```

Provider tests use stubs (no API key/credits). They cover token restrictions, missing config/origin, cooldown, 401/402/403/429/500 provider failures without secret disclosure, and the existing account authorization middleware (missing/expired/blocked/revoked sessions).

Browser fixture uses canvas streams and an injected SDK only in the test harness. It covers consent, denied/late camera permission, Stop during pending connect, late session cleanup, garment change, invalid upload, hidden tab, page exit, unmount, local expiry and layout at 360/390/768/1024/1440px. Linux Chrome runner is used in CI. No actual customer photos or credentials are used in tests.

Manual checks still required with the owner's explicit permission and funded key: real Decart model entitlement/credits errors, output quality, provider-enforced cutoff, mobile Safari/Android camera behavior, and product-image CORS. If a product image cannot be fetched cross-origin, upload a garment file instead. Do not add an arbitrary server-side image proxy.

The AI preview is not a physical fit/size guarantee. Existing Anywear sample assets are reused for this demo; verify licensing before a public commercial rollout.

## Return to the previous version

Stop API and storefront before installing dependencies (Windows otherwise locks esbuild.exe). Preserve uncommitted changes first. To inspect/run the previous version without rewriting history:

```powershell
git fetch origin
git switch backup/before-live-tryon-2026-11-06
npm ci
npm run dev:api
```

Run `npm run dev:store` in a second terminal. No database rollback is needed. To remove the feature from the working branch itself, revert the single integration commit, then push normally; do not reset or force-push shared history.


## Blank AI output diagnostics
Token HTTP 200 and LiveKit signaling connected do not prove video delivery. The UI now distinguishes connected, stream received, and playable video (playing event with nonzero dimensions). No playable video within the 30-second total budget is an error, not a successful trial. Camera tracks stop on timeout. Start displays an account cooldown; HTTP 429 provides Retry-After and retryAfterSeconds.

No real provider session was run for this patch. A missing remote stream may still require network/provider investigation. The SDK cannot directly abort pending connect: camera and token fetch stop immediately; late connections disconnect when resolved. No automatic new trial is started.


## Explicit garment acknowledgement
The frontend now connects first, attaches terminal/error listeners, then awaits session.set({prompt, image, enhance:false}) as shown in the official VTON JavaScript example. Output is hidden until garment acknowledgement and playable video are both observed; a rejected garment ends the trial and stops the camera. This isolates garment submission from transport initialization. Acknowledgement does not prove visual accuracy or that remote frames will arrive. Real provider testing remains outstanding; this patch does not establish the root cause of the reported blank stream.

## Diagnosing a trial without exposing credentials
Open **Connection details** in the fitting room. It stays available after Stop/timeout and automatically expands on errors. It records whether the image decoded, camera opened, token arrived, SDK connect/publish completed, garment was acknowledged, a remote stream arrived and playback started. Numeric outgoing bytes and incoming/decoded frames are included only when the SDK reports them. No raw SDK objects, IP addresses, session identifiers, images or tokens are copied into the panel.

A queue position appears only if Decart reports one. Missing stats mean **not reported**, not zero and not proof of failure. Zero outgoing bytes suggests checking camera publishing; received frames without decoded frames suggests checking the media/decoder; decoded frames without playback suggests checking the video element. These are diagnostic clues, not a confirmed root cause.

Image URLs are fetched and decoded in the browser (10-second timeout, 5 MB limit) before camera/token creation. Cross-origin failures and invalid images now fail before starting an AI session; upload a local garment instead. Replacement garments use the same validation.

The 30-second local budget still includes token authorization, connection/queue time and processing. It does not restart when frames arrive; provider maxSessionDuration remains 30. This conservative limit can end a slow setup before output appears. Do not extend it, enable retries or turn on paid fast mode without reviewing cost and lifecycle handling.

Connection failures now preserve the original rejection instead of replacing it with a generic disconnected message. Timeouts distinguish missing token, queue/connection, garment acknowledgement and playable video. Provider credit/session-limit reasons are displayed separately. Stop during pending connect still cannot immediately cancel the SDK handshake; any late result is disconnected.

Automated tests use local fixture images/canvas streams and a fake SDK; they do not prove live Decart output. Browser checks support installed Windows Chrome/Edge or Linux Chrome and TRY_ON_TEST_BROWSER. Before a live check, rotate any credential previously exposed in a screenshot. No real AI calls are made by tests.

To pause this feature while developing AI assistant: set TRY_ON_ENABLED=false in your private server configuration, restart the API, and leave existing product/account data unchanged.

