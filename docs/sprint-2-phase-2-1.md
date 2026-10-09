# Sprint 2 Phase 2.1 — KD Design
Scope: Shop Page and Product Detail Page. Branch: \`feature/sprint-2\`.

- Shop: URL-driven search, brand/category/size/price/in-stock filters, sorting, pagination, reset.
- Product detail: SKU-specific size/color, quantity limited by stock and cart cap, related products, optional product image fallback, 3D studio link.
- Backend routes, carts, orders and admin CRUD unchanged.
- Fictional demo product labels and placeholder visuals remain intentionally marked.
- Fitting Studio remains a geometric demonstration, not an AI fit guarantee.

## Run on Windows CMD
\`\`\`cmd
cd /d D:\KD-Design-Starter\KD-Design-Starter
git status
git pull --ff-only origin feature/sprint-2
npm test
npm run build
npm run dev:store
\`\`\`
Test http://localhost:5173/shop and http://localhost:5173/product/essential-sculpt-tee.
Next: admin CRUD usability and end-to-end checkout verification.
