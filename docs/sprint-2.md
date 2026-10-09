# Sprint 2 — Homepage modularization (Phase 1)

- Branch: \`feature/sprint-2\` (leave main stable).
- Added standalone \`Navbar\`, \`Footer\`, \`HomePage\`, \`ProductCard\` and seven home sections.
- Added working Clothing, Outerwear, Bottoms, Accessories homepage links.
- Mobile menu gains aria-expanded and Escape dismissal.
- Kept existing Shop, Product Details, Cart, Checkout, Admin and API logic unchanged.
- Virtual Fitting is still a geometry demo; it does not predict accurate fit.

## Windows CMD

\`\`\`cmd
git switch feature/sprint-2
git pull --ff-only origin feature/sprint-2
npm install
npm run dev:store
\`\`\`

Open \`http://localhost:5173\` and inspect Homepage and menu at mobile size.

## Checks

\`\`\`cmd
npm test
npm run build
\`\`\`

## Next

Split Shop, Product Detail and Admin into modules, improve CRUD forms, and add API error/empty states.
