# KD DESIGN — React Retail Merge Preview

Branch: experiment/react-retail

## What remains from the original React Homepage
- Split fashion photography / copy Hero at /
- Ivory / Charcoal / Olive editorial palette; logo stays on left
- Existing Router, account, Cart, authenticated Admin, COD Checkout and 3D Fitting
- Existing products/SKUs, brands, inventory and Archive/Restore/DELETE rules

## Added retail UX
- Collections mega menu (Accessories, Bags, Clothing, Shoes and product types)
- Real Brands mega menu A–Z, populated by the database (not hardcoded brand list)
- All Products and Sale links; larger navigation typography and icons
- Shop with five compact product cards per row on desktop; mobile 2 columns
- Horizontal filters: brand, collection, type, availability, price, size, sale, sort
- Sale / Sold Out badges, prices and active filter chips, catalog pagination
- PDP gallery with multiple actual images (click to enlarge), larger brand text, red sale badge,
  original price strikethrough, green/grey stock dot, Sold Out disabled Add to Bag
- Admin supports sale pricing, product type, uploading up to 6 photos per batch (8 total),
  and individual photo removal. Existing one-photo cover feature remains.
- Backend COD checkout charges the effective sale price and stores it in order items.
- Footwear category can be created in Admin. Empty menu categories yield empty Shop results
  until you add real matching products; no products or partners are fabricated.

## Safe local trial — PowerShell
Stop running servers (Ctrl+C). From the monorepo root:

    cd D:\KD-Design-Starter\KD-Design-Starter
    git status
    git fetch origin
    git switch --track origin/experiment/react-retail
    npm install
    docker compose up -d postgres
    npm run db:init
    npm test
    npm run build

If the branch already exists locally use git switch experiment/react-retail instead of --track.
If git status shows uncommitted changes, preserve them before switching; do not reset --hard.
Open two terminals and run:

    npm run dev:api
    npm run dev:store

Then visit http://localhost:5173/ for the original Hero + upgraded navigation,
http://localhost:5173/shop for the retail grid,
http://localhost:5173/admin to edit products, and
http://localhost:5173/product/essential-sculpt-tee to try the gallery.

Do not run db:seed again unless you explicitly wish to seed fictional demo data.
db:init only adds products.sale_price, products.product_type and a product_images table,
and assigns product types for six known demo products with previously unset type.
No user accounts, orders or products are deleted.

## Manual QA
- Desktop 1440px: 5 columns. Tablet: 3–4. Mobile 390px: 2.
- Open and close Collections/Brands via mouse, keyboard Escape and mobile menu.
- Admin set original price and optional sale price below it; upload two real photo files.
- Shop price strikethrough/red badge; Sale filter, brand heading, sizes and product type.
- Product Details gallery enlarge, available size, green In stock or grey Out of stock.
- Add to Bag / COD Checkout uses server-calculated sale price.
- Stock 0 shows Sold out and prevents purchase.
- Product CRUD / Archive / Restore / Permanent DELETE and Orders remain available.
- Ineligible users are blocked from Admin routes.

## Rollback
Stop API/Store with Ctrl+C; then:

    git switch feature/sprint-2
    npm run dev:api
    npm run dev:store

The original React UX returns; do not delete the DB or Docker volume.
The additive experimental DB columns/table remain but are ignored by original code.
Existing credentials, orders, inventory and uploaded photos remain.

## Development limits
Only JPG/PNG/WebP image files up to 3MB are accepted. Photos are stored locally
under server/uploads/products/ and are not in GitHub. Back up images alongside DB.
Production would need persistent object storage, upload scanning, image optimization and real brand rights.
3D fitting remains an illustrative preview, not guaranteed size fit.
