# KD Design — Sprint 2 Phase 2.3

Admin upload and display of actual product images (local development only).

## Upgrade safely on Windows CMD
\`\`\`cmd
cd /d D:\KD-Design-Starter\KD-Design-Starter
git status
git pull --ff-only origin feature/sprint-2
npm install
docker compose up -d postgres
npm run db:init
npm test
npm run build
npm run dev:api
\`\`\`
In a **separate CMD**, start \`npm run dev:store\`. Sign in as Admin at \`http://localhost:5173/login\`, go to \`/admin\` → Products / Inventory, choose a product and a JPG/PNG/WebP file under 3 MB, and click UPLOAD PHOTO. Visit Shop/Product Details to see the image. REMOVE PHOTO brings back the illustration.

\`npm run db:init\` performs an **additive** \`image_url\` migration; it does not erase existing users, products or orders. Never delete your PostgreSQL Docker volume for this upgrade.

Image bytes are stored under \`server/uploads/products/\` and excluded from Git. Back this directory up together with PostgreSQL; the uploaded images are *not* pushed to GitHub. This local filesystem storage is for coursework/demo use, not production. Only upload original or appropriately licensed photos.

Security: only authenticated Admin can upload/remove, 3MB max, file signatures checked for PNG/JPG/WebP, UUID file names, no SVG/HTML. Production requires persistent storage, image processing/scanning, quotas and operational safeguards.

COD Checkout uses fictional sample information only. 3D Studio is still a geometric demo, not AI sizing or textile simulation.
