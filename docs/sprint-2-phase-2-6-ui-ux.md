# Sprint 2.6 — UI/UX Refinement & Motion

KD Design retains the original editorial luxury direction (deep green, cream, serif headings) while correcting difficult-to-read microtext on all major pages and the fitting studio.

## UX decisions
- Navigation: 14–16px text, touch-friendly 44px targets, sticky header which compresses gently on scroll, mobile dropdown switches on at 1200px to prevent overflow.
- Body copy: generally 16–18px. Eyebrows: 13px. Buttons: 13–14px. Forms and selects: ~15–16px. Admin labels: 12–15px minimum.
- Higher contrast for secondary text and more legible price/brand details.
- Home: subtle hero artwork breathing, editorial scroll reveals, gallery/card hover zoom, category and brand interactions.
- Shop: scroll reveal for page introduction and product card animations without changing search/filter/sort/pagination data logic.
- Motion handled by framer-motion in the Store only. Reusable Reveal component uses a once-only IntersectionObserver-powered viewport reveal.
- Respect OS Reduced Motion. Native CSS animations and scroll smoothing stop with prefers-reduced-motion: reduce; Framer Motion skips entrance movement with useReducedMotion.
- Studio: larger headings/labels, links and select fields; underlying 3D fitting behavior unchanged.
- Admin: form labels, input text, status tags, stock, actions, delete-confirm modal and order tables are all enlarged.

## Updating your local copy (PowerShell or CMD)
1. Stop dev servers, and run git status. If there are local modifications, preserve/commit them first.
2. git pull --ff-only origin feature/sprint-2
3. npm install
4. npm test
5. npm run build
6. Restart npm run dev:api, npm run dev:store and npm run dev:studio.

No database schema migration or seed required. No changes to products, passwords, images or order data.

## Manual accessibility acceptance checks
- Desktop widths: 1440, 1280 and 1024px; confirm menu stays readable and collapses rather than overflowing.
- Mobile widths: 390 and 320px; check mobile menu, long prices, filters and checkout input sizes.
- Tab through header/product cards and Admin buttons. Focus outline should be visible; click targets should be large enough.
- Turn on Reduce Motion in OS/browser and check that all content remains visible without forced animation.
- Scroll Home/Shop: sections reveal once, cards hover smoothly, product photos remain clickable.
- Check Shop search/filter/sort, product details, cart, checkout, login, Admin CRUD & permanent delete still work.

No claim of production WCAG conformance is made until dedicated accessibility audits and real-user testing are completed.
