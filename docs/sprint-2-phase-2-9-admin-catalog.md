# KD DESIGN — Admin Catalog Workflow (Sprint 2.9)

This release is **on feature/sprint-2**. It replaces the previous two-step Admin
product workflow with one form, while preserving existing SKU stock, photo gallery,
Archive/Restore and Safe Permanent Delete tools.

## Categories and migration
Exactly four canonical collections are available: **Accessories**, **Bags**,
**Clothing** and **Shoes**. Run `npm run db:init` after pulling this branch.
The additive migration maps old `tops`, `bottoms` and `outerwear` to Clothing,
`footwear` to Shoes, and recognizes accessory bag-like product types/slugs as
Bags. Other Accessories remain Accessories. Existing orders, users, products,
stock, IDs and slugs are preserved.

Product Type provides the subcategory (e.g. Shirt, Jacket, Slides). Collections
and Shop filter values now use the same categories as Admin.

## Admin / Products & Inventory
1. Open **Products / Inventory**. Enter product name, brand, one of four
   categories, product type, original price and optional sale, status, description.
2. In **Available colors**, add multiple named colors (Black, Red, Gray or
   custom) and use the color picker to set the `#RRGGBB` swatch.
3. Enter comma-separated sizes (e.g. S, M, L or ONE SIZE) and an initial stock
   quantity. Press **Generate Color × Size** to create/edit individual SKU rows.
4. Edit any individual stock quantity or SKU.
5. Select up to six JPG/PNG/WebP photos, each under 3 MB.
6. Click **CREATE PRODUCT WITH PHOTOS** once. For an existing product,
   click **EDIT** and **SAVE ALL PRODUCT CHANGES**. The backend validates and
   commits product, new/existing SKU variants and image metadata in one SQL
   transaction, rolling back on validation or database error and removing
   newly written files if the transaction fails.

The `Enable mannequin demo` checkbox has been removed from the Admin form,
but historical 3D demonstration fields are not deleted from the database.
Edits never silently delete order-linked SKU rows. Existing Admin stock editing
and separate image controls remain available.

New products default to Draft. Switch to Active once you have added the real
SKU stock and licensed product images. Existing image uploads are preserved
when you edit a product. On creation, the first upload is its cover; on edit
images are appended to the gallery. Remove older images using the existing
Product Gallery Remove action.

## Admin / Brands
Create or edit a brand with its name, description and an optional image/logo
in the same form. JPG, PNG or WebP under 3 MB. Brand photos are visible in
Brand Management and homepage brand cards, and can be removed separately.
Note that brand creation and image upload are two network operations:
if the photo fails, the saved brand remains and you can retry from Edit.

## Product Details
Customers see color swatches derived from actual SKU variants, followed by
sizes for their selected color. Out-of-stock sizes are disabled. The green
In stock indicator becomes gray Out of stock when all sizes in the selected
color are exhausted. Cart uses the exact selected variant ID and the Backend
enforces inventory at Checkout.

## Update locally — PowerShell
Stop the Store/API servers first. At the monorepo root run:

    cd D:\KD-Design-Starter\KD-Design-Starter
    git status
    git fetch origin
    git switch feature/sprint-2
    git pull --ff-only origin feature/sprint-2
    docker compose up -d postgres
    npm run db:init
    npm test
    npm run build

**Check git status before switching or pulling.** Save/commit/stash any uncommitted
work; do not discard local edits or use a destructive reset. Do not run db:seed
again unless you intentionally want to insert fictional demo records. The db:init
script is repeatable and keeps existing data.

API: `npm run dev:api` then http://localhost:4000/api/health
Store: `npm run dev:store` then http://localhost:5173/admin

If port 4000 is occupied, stop the duplicate API process rather than starting a
second server.

## Smoke test
- Edit/Create one **Clothing** item, with Black, Red and Gray in S/M/L and
  inventory 2/4/0. Upload two photos in the same save.
- Verify Shop, Product Details images and selected color-to-size variants.
- Verify grey Out of stock when choosing a color with zero available stock.
- Edit sale price; check crossed-out original price on Shop/Product Details
  and corresponding checkout price.
- Upload an image to a Brand and confirm it appears in the Brand card.
- Check Archive/Restore, inventory and DELETE still work, and user role cannot
  access Admin endpoints.
- Test on desktop and mobile widths.

Images are currently stored on the API machine; back up
`server/uploads/products` and database separately before major local changes.
