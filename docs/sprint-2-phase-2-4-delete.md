# Sprint 2.4 — Safe Permanent Delete

KD Design retains Create / Read / Update / Archive / Restore / Stock / Orders. This feature adds separate guarded permanent removal.

## Rules
- Admin only: JWT role checked by the API.
- Product status must be Draft or Archived.
- All SKU inventory must be zero.
- There must have been no order items linked to this product, even from cancelled orders.
- Eligibility check GET: /api/admin/products/:id/delete-check
- Permanent removal DELETE: /api/admin/products/:id/permanent
- The existing DELETE /api/products/:id remains soft delete (Archive).
- UI requires typing DELETE. The backend always rechecks status, stock, and order references under PostgreSQL row locks.
- Product and unused SKUs are removed transactionally; audit log captures original product/SKUs and actor.
- Uploaded photo cleanup runs only after DB commit. File clean-up errors are logged, not rolled back.

## Safe update, Windows PowerShell
Stop Vite and the API, then:
    cd D:\KD-Design-Starter\KD-Design-Starter
    git status
    git pull --ff-only origin feature/sprint-2
    docker compose up -d postgres
    npm run db:init
    npm test
    npm run build

Start npm run dev:api and npm run dev:store in separate windows.
Sign in to /admin → Products / Inventory.
Use a test Draft/Archived product, set all SKUs stock to zero, and confirm it has no order history. Click DELETE, type DELETE and confirm.

## Acceptance criteria
- Active product / nonzero stock → DELETE disabled; API returns HTTP 409.
- Archived product with order history → modal shows blocked; API returns 409.
- User token → HTTP 403, unauthenticated → HTTP 401.
- Eligible draft/archived test product → gone from Admin catalog after confirmed delete.
- Order history and all previous management screens remain intact.
- Database reset and Docker volume removal are not required.

This feature permanently deletes data. Always test with disposable products, never production inventory.
