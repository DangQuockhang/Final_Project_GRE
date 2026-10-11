# KD Design — Sprint 2 / Phase 2.2

Admin Dashboard and CRUD UX improvements implemented on \`feature/sprint-2\`.

- New admin module at \`apps/store/src/pages/admin/\`.
- Dashboard metrics: active products, low-stock variants, pending orders and delivered order value (not verified payments).
- Brand CRUD: create, read, edit name/description, delete only if no associated products.
- Product CRUD: create, edit, activate, draft, archive and restore. Categories are the four **fixed** API values, not dynamic category CRUD.
- Inventory: create SKU/size/color and update stock, with input validation.
- Orders: status transitions and explicit cancellation confirmation.
- Navbar shows ADMIN link only to admins; backend already enforces admin authorization.
- No real brands/suppliers, upload, payment provider, or AI garment physics integration is implied.

## Update on Windows (CMD)

\`\`\`cmd
cd /d D:\KD-Design-Starter\KD-Design-Starter
git status
git pull --ff-only origin feature/sprint-2
npm test
npm run build
npm run dev:store
\`\`\`

Open \`http://localhost:5173/admin\`. Log in with your configured *local development admin* account. Backend + PostgreSQL must run for admin API calls.

## Verification
1. Add a fictional brand, edit it, and confirm it cannot be removed while it owns products.
2. Create a product as draft, add SKU (size/color/stock), activate it, then confirm it appears in Shop.
3. Update stock and verify the product detail quantity limit reflects the server.
4. Place a COD test order; confirm/cancel it and check stock and order status.
5. Confirm non-admin users cannot request admin APIs (HTTP 403).

Next: integration tests with PostgreSQL, improved image management and configurable category module.
