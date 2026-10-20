# KD DESIGN — Sprint 2: Orders, Brand Edit, Checkout (2026-10-20)

**Production claims:** This remains a student-operated prototype. New bank-transfer
support is an **offline/manual verification workflow**, **not a payment gateway**
or automatic settlement. COD and manual bank transfer are the only selectable
methods. MoMo, ZaloPay, credit cards and Stripe are not wired up, so they are
not advertised as available.

## Changes
- Brands: Edit opens a dialog, with name, description, upload replacement,
  preview, and a separate Remove image button. Create remains inline. There is
  no scroll-to-create-form behavior when clicking Edit.
- 3D Fitting: Navbar, PDP, Home and Footer entry points have been removed.
  The 3D Studio source/workspace is deliberately retained to avoid deleting past work.
- General: Removed nonessential Sprint/demo labels from admin, homepage,
  navigation and footer. Storefront API errors remain visible instead of pretending
  the site is connected. Checkout is still labeled as in development.
- Orders: Customer-facing order refs are **KD-YYYYMMDD-RANDOM12HEX** (Vietnamese
  date; cryptographically random suffix). Internal sequential database IDs remain,
  so existing history and foreign keys are preserved. Old orders get one-time
  deterministic KD references during migration.
- Order photos: Snapshot the uploaded image URL, product name, brand, slug,
  SKU size, color, quantity and unit price when the order is created. The orders
  API exposes these values to the owner and admin only.
- Admin Orders: Search by reference, recipient, email or phone; filter by
  fulfillment and payment method; display item photos, address and payment state.
  Authorized admin can confirm received bank transfer after checking their bank
  account. Confirmation of bank-funded orders is blocked until payment marked PAID.
- Account: Customer order history uses the same photo-led card design.
- Checkout: Opt-in browser geolocation followed by OpenStreetMap's Nominatim
  reverse geocoding to propose an address. User may edit before ordering.
  The location is never automatically requested, and latitude/longitude are
  not stored by the application. Sending coordinates to Nominatim is explicitly
  disclosed by the UI. Location may not identify house numbers accurately.
  Manual address entry always remains available.
- Payment: COD or manually verified BANK_TRANSFER only. Order creation NEVER
  marks a bank order PAID. Cancelling a paid order sets REFUND_PENDING and does
  not refund funds automatically.

## Update on Windows PowerShell
From the monorepo root:

    cd D:\KD-Design-Starter\KD-Design-Starter
    git status
    git switch feature/sprint-2
    git pull --ff-only origin feature/sprint-2
    docker compose up -d postgres
    npm run db:init
    npm test
    npm run build

Do not run \`git reset --hard\`; stash/commit your local changes before pulling.
Do not delete containers/volumes or reseed an existing database.
This release **requires** \`npm run db:init\`, which adds order_ref,
payment_status and ordered-item snapshot columns without removing existing records.

Start API and frontend in different terminals:

    npm run dev:api
    npm run dev:store

## Bank transfer configuration
Bank transfer stays disabled unless **all three** fields are in \`server/.env\`:

    BANK_TRANSFER_BANK=Your Bank Name
    BANK_TRANSFER_ACCOUNT=Your Receiving Account Number
    BANK_TRANSFER_NAME=Your Account Holder Name

Do not use real payment account information during public demos unless
you intend to receive payments. Do not commit \`server/.env\`.
Restart \`npm run dev:api\` after editing the file.
The payment method endpoint returns the account information to customers
only when configured. When the customer selects BANK_TRANSFER:
- POST order creates a record with \`AWAITING_TRANSFER\`.
- Confirmation page/My Account displays bank, account, amount and exact KD ref.
- Customer transfers money outside the app and includes the KD ref.
- Admin manually checks the bank account then clicks Verify transfer.
- API marks PAID; only then can the admin confirm a bank-transfer order.
- If the order is later cancelled, \`REFUND_PENDING\` warns a manual refund is due.

Use dedicated backend payment service/webhook integration and secure credentials
for online cards or local wallet payments in a later sprint.

## Manual QA
1. **Brands**: Click Edit on a brand far down the list: modal opens without
   page scrolling. Replace logo; open again; remove photo; brand remains.
2. **3D**: No 3D CTA in Navbar, homepage, PDP or footer.
3. **Orders**: From Checkout create a COD order: Admin Orders and My Account
   show the same KD reference and photo thumbnails. Check the displayed amount
   against the actual server-calculated order total.
4. **Address**: Manually type an address. Optionally try browser permission
   button in HTTPS or localhost and edit the returned approximate suggestion.
5. **Payment**: Without bank env vars, bank option disabled. After adding
   configured bank details, create bank transfer order. It is not marked paid.
   Admin confirm status before verify must reject, then verify and confirm.
6. **Safety**: Cancel paid transfer; REFUND_PENDING instead of auto-refund.
   An unauthenticated/customer role must be blocked on Admin status endpoints.

**Data limitations:** Product photos stored on local filesystem can become
unavailable if an Admin physically removes those uploaded files. Order line
metadata survives, but photo rendering then shows an "Image unavailable"
placeholder. Before production, move media to durable object storage and
do not delete ordered image assets.
