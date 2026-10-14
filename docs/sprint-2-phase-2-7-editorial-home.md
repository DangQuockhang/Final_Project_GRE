# KD DESIGN — Homepage Redesign (Sprint 2.7)

Design direction chosen with the user:
- **Timeless Minimal Luxury palette A**: ivory \`#F7F5F0\`, charcoal \`#242824\`, taupe \`#B8AB98\`, olive \`#435447\`.
- **Concept 2: Modern Retail** — effective catalog discovery, whitespace, visible links/labels and responsive category/product grids.
- **Concept 3: Premium Interactive (subtle)** — reveal on scroll, hover zoom, gentle motion and Reduced Motion support.

## Key changes
- English-language split-layout homepage with a fashion editorial hero and working Shop / Brands CTA.
- Headline, supporting copy, category cards, current catalog cards, editorial style story, dynamic brand panels, 3D Fitting introduction, final shopping CTA.
- Responsive layouts for desktop (1440), tablet (768) and mobile (390/320).
- Sticky header, upgraded English branding, mobile menu, working catalog search form navigating to \`/shop?q=...\`.
- Existing Store, Shop, Product Detail, Cart, Checkout, Auth and Admin backend workflows are **not replaced**.
- Removed blanket “NEW SEASON” badge, since product date/status was not validated. Replaced with functional View Piece visual.
- Product cards use existing dynamic products, images and product detail URLs.
- All nav/category CTA destinations map to routes supported by the current prototype.
- Images are **external Unsplash editorial placeholders** and depend on a third-party network connection; replace them with original/licensed local assets before production. They are not claimed to depict products in the database. CSS gradients remain as fallbacks when imagery is unavailable.
- Brand entries are the current demo database values; no official partnerships are claimed. The checkout remains a COD demo and size guidance remains a prototype.
- Footer intentionally doesn't implement a pretend newsletter signup (backend lacks subscriptions).
- No PostgreSQL migration, no data reset, no secret or credentials changes.

## Update local Windows project
\`\`\`powershell
cd D:\KD-Design-Starter\KD-Design-Starter
git status
git pull --ff-only origin feature/sprint-2
npm install
npm test
npm run build
\`\`\`
Start \`npm run dev:api\` and \`npm run dev:store\` in separate terminals, then visit \`http://localhost:5173\`.

## QA checklist
- At 1440/1024/768/390/320 widths, no horizontal scrolling or cutoff nav; hero headline and CTAs fit.
- Search icon opens keyboard-focusable form and submits /shop?q=...
- Shop by Category navigates to a supported category; brand cards navigate to supported brand filter.
- Product cards link to the product detail.
- Page shows sensible empty state if catalog or brand data unavailable.
- Scroll sections reveal once; Reduce Motion respects OS preference.
- Test Product Details → Add to cart → Checkout → My Orders.
- Log in as Admin and verify CRUD, image upload, Archive, DELETE, Orders.
- Unsplash images may load slowly or fail on a filtered network: fallback background remains.
