# KD Design live try-on

Integrated into the existing product page and authenticated storefront on branch `feature/customer-membership-sprint-2`. UI language: English. No database migration is required.

## Start locally

Keep the permanent key only in private server configuration, never in VITE variables, Git or screenshots:

```dotenv
TRY_ON_ENABLED=true
DECART_API_KEY=your_private_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Get your key from https://platform.decart.ai and check model access and credits there. Rotate any key previously exposed in a screenshot. This file contains placeholders only; no configuration file is changed automatically.

```powershell
git switch feature/customer-membership-sprint-2
git pull --ff-only origin feature/customer-membership-sprint-2
npm run dev:api
```

In another terminal in the same folder:

```powershell
npm run dev:store -- --force
```

Stop old dev servers first. Dependencies did not change in this update. For a fresh checkout, run `npm ci` while dev servers are stopped (Windows can otherwise lock esbuild.exe).

## Session duration: manual Stop

At the owner's request, there is no application setup timeout, live preview countdown or `maxSessionDuration` token constraint. The display shows elapsed time. At 45 seconds without output, a diagnostic notice explains the pending stage but does not disconnect the session.

Credits may be consumed during preparation and throughout the session. There is no application spending cap. Decart can still end a session for service/account limits or insufficient credits; removing our timer cannot override those. This is not a promise of unlimited service.

Stop, hidden tab, pagehide, navigation/unmount and provider failure still shut down camera tracks and the session. Keep the fitting-room tab visible while testing; opening WebRTC Internals in another tab intentionally stops the trial. Stop during pending SDK connect stops local tracks immediately, aborts authorization and disconnects any late result; SDK 0.2.14 does not support aborting an in-flight handshake. Another Start stays guarded until it settles. No automatic connection retries or paid fast mode.

## API and credentials

Official SDK `@decartai/sdk@0.2.14`, model `lucy-vton-3.6`.

- Authenticated GET /api/try-on returns readiness plus sessionMode:manual-stop, tokenTtlSeconds:300, cooldownSeconds:30. Readiness does not establish credits/model access.
- Authenticated POST /api/try-on validates exact Origin and requests a short-lived token restricted to that origin and model, with expiresIn:300 and no duration constraint.
- Token expiry prevents new connections, not an established session. The frontend caches the token and refreshes it only when an active SDK operation needs it near expiry, for example changing a garment after five minutes. This does not start a new AI session. No background credential refresh.
- Issuance retains a 30-second per-account cooldown. This limits requests, not session duration. For multiple API instances use a shared rate-limit store before public rollout.
- Errors: 401 missing/expired login, 403 blocked account or invalid Origin, 429 issuance cooldown, 503 disabled/missing key, 502 safe provider error. No permanent key or raw provider response is returned.
- The frontend rejects the older bounded-session API policy with a restart instruction.

Official references:
https://docs.platform.decart.ai/getting-started/client-tokens
https://docs.platform.decart.ai/sdks/javascript-realtime
https://docs.platform.decart.ai/models/realtime/virtual-try-on

## Missing video and the development worker fix

HTTP 200, connection-ready and garment ACK do not prove that camera video is being sent or AI output exists. In the reported capture, local camera frames were verified but SDK outgoing bytes stayed zero and no AI stream was reported.

We reproduced a specific development packaging failure: Vite's optimized SDK contained a relative frame-metadata-worker.js URL pointing into .vite/deps, where that worker was absent. The real SDK worker failed its init acknowledgement. Store Vite now excludes @decartai/sdk from dependency pre-bundling so its worker URL is resolved from the package, while separately pre-bundling p-retry and its CommonJS dependencies. The fix does not alter SDK internals or disable encoded-frame processing. Restart Vite with --force after pulling to discard old optimized dependencies.

Automated worker regression uses the real SDK with synthetic video, a test-only credential and a blocked WebSocket constructor. It verifies that the worker loads and acknowledges init without calling Decart. This reproduces a local bug consistent with the zero-byte symptom; only a real authorized session can confirm that it fixes the user's machine.

The app checks JPG/PNG/WebP garments up to 5 MB and two playable camera frames before requesting a token. Camera preflight and image-load timeouts are local checks, not AI session duration limits. Video is sent unmirrored with VP8; the local preview is mirrored with CSS. Garment changes await provider acknowledgement. Never substitute original camera video for the AI result.

Connection details contains safe stage flags and numeric counters, not tokens, addresses or photos. Missing counters mean not reported. Send a screenshot of this panel after Stop if output remains absent; do not send raw network exports or environment files.

## Phone UI/UX preview over Wi-Fi

1. Connect phone and PC to the same trusted Wi-Fi. Keep the PC awake.
2. Run `npm run dev:api`.
3. In a second terminal run `npm run dev:store:lan`.
4. Open the **Network** URL Vite prints, such as http://192.168.1.10:5173, on the phone. Use the real address printed on your computer, not this example and not localhost.
5. If Windows asks, allow Node on the private network. If unreachable, check the PC's Wi-Fi IPv4 with `ipconfig`, firewall port 5173 and router client isolation.

LAN mode overrides VITE_API_URL with /api for this run and proxies /api and /media to the PC's local API at 127.0.0.1:4000. It does not edit any .env file or relax authentication/origin checks. Existing ordinary development/API configuration is unchanged. All services retain existing login/authorization. Do not expose the dev server with router port forwarding.

HTTP over the LAN supports UI/UX inspection, products and account flows; it does **not** provide a secure camera context. Mobile live camera requires a trusted HTTPS URL. Use an HTTPS deployment or a trusted local HTTPS setup, proxy API/media through that same origin, and explicitly add that exact HTTPS origin to server ALLOWED_ORIGINS before minting try-on tokens. Do not use wildcard origins, a frontend key or browser security bypasses. No public tunnel is created by these scripts.

To stop sharing, Ctrl+C the LAN dev server. No router changes are required.

## Verification and limits

```powershell
npm test
npm run build
```

Coverage: missing key, authentication/blocked/revoked sessions, exact Origin, rate limiting, provider failures, unbounded-session token policy, on-demand token refresh and cancellation, worker asset load, local WebRTC VP8 transfer, missing camera frames, Stop during pending connect, long waits and sessions beyond ten minutes, replacement garments, upload rejection, hidden tab/page exit/unmount, and five viewport widths (360/390/768/1024/1440). LAN tests proxy to a temporary local API and preserve the phone's Origin/auth header; media URL tests retain same-origin paths.

No paid AI calls or physical phone-camera sessions are run automatically. Actual Decart output, credits/billing, the user's Wi-Fi and mobile camera behavior require an authorized manual check. A passing synthetic test is not a claim that real try-on output is verified.

## Disable or roll back

Set TRY_ON_ENABLED=false privately and restart the API to refuse new tokens. With no duration cap, disabling issuance does not forcibly terminate an already active provider session: press Stop or close the fitting-room page too.

Use git revert on the update commit to undo it without rewriting shared history. To inspect the pre-feature version, use branch backup/before-live-tryon-2026-11-06. Preserve any uncommitted work before changing branches. No database rollback is needed.
