# KD Desgin — Full-Stack Store + 3D Fitting Studio (Sprint 1)

Starter source code for an **educational / prototyping** multi-brand fashion e-commerce concept. All brands and products are **fictional demo labels**; none represent an authorized dealer relationship. The mannequin is **procedural 3D** (NOT an AI fitting predictor and NOT a fabric simulation).

## Project structure

```text
apps/store/                React + Vite store (port 5173)
apps/studio/               React + Vite dedicated 3D studio (port 5174)
packages/virtual-fitting/  Shared react-three-fiber mannequin component
packages/catalog/          Fallback demo data for frontend preview
server/                    Express REST API, pg + SQL (port 4000)
server/sql/001_schema.sql  Database schema
.github/workflows/ci.yml   GitHub CI
```

## Requirements

- Windows/macOS/Linux with **Node.js >= 20.19** (Node 22 LTS recommended) and npm.
- Docker Desktop with Docker Compose for the PostgreSQL container, or an existing PostgreSQL instance.
- VS Code is optional but recommended.
- An internet connection to install npm dependencies initially.

## Local quickstart (PowerShell)

Open a terminal in the extracted `KD-Desgin-Starter` folder:

```powershell
npm install
Copy-Item server/.env.example server/.env
Copy-Item apps/store/.env.example apps/store/.env
Copy-Item apps/studio/.env.example apps/studio/.env
```

**Edit `server/.env`** to use a fresh, randomly generated `JWT_SECRET` of at least 32 characters and a strong `ADMIN_PASSWORD`. The values in `.env.example` are illustrative *development-only* settings. Never commit `.env` files. These files are excluded by `.gitignore`.

Start PostgreSQL:

```powershell
docker compose up -d
```

Initialize and seed (only once; safe to rerun seed for missing example items):

```powershell
npm run db:init
npm run db:seed
```

Run **three terminals** inside the project folder:

```powershell
npm run dev:api
npm run dev:store
npm run dev:studio
```

Visit:

- **Store:** http://localhost:5173
- **3D Studio:** http://localhost:5174
- **API health:** http://localhost:4000/api/health
- **Admin:** http://localhost:5173/login — use the admin credentials you configured in `server/.env` **before** running `npm run db:seed`.

Without Docker/PostgreSQL, you can still preview both frontends using **fictional fallback data** after `npm install`, but authentication, product CRUD, stock changes and checkout require API + DB.

## Demo walkthrough

1. On Store home, browse products and filter by brand/category.
2. Open an example T-shirt and click **TRY ON 3D MANNEQUIN**; the dedicated fitting studio opens with that product.
3. Adjust mannequin shape, height, chest, apparel size and color; rotate the model with drag gestures.
4. Go back to the Store, add a product variant to the cart.
5. Register a customer account and submit a **COD demo order** with **non-sensitive test data only**.
6. Login to the Admin dashboard to create a brand, create/update/archive products, add variants/change stock and move order status. Cancelling a pending or confirmed order restores reserved stock.

## What's implemented

- Multi-page responsive premium Storefront, fictional brands, product search/filter, details and local browser cart.
- User registration/login with bcrypt hashing and JWT; Admin-only endpoints.
- Brand CRUD, product CRUD (soft-delete/archive), size variants/inventory management, order placement and order status management.
- PostgreSQL transaction with row locking for order creation and stock reduction.
- Shared 3D mannequin demo using React Three Fiber + Drei; shape, chest, height, garment size and color. Rule-based sizing demonstration.
- GitHub Actions build/unit test workflow and JavaScript sizing unit tests.

## Important limitations — NOT production-ready

1. Product visuals are CSS placeholders and example brands are fictional. Add photos, licenses, verified supply documentation before selling.
2. Fitting geometry consists of simple procedural meshes; it does not simulate textiles, precise patterns, drape, motion or actual try-on accuracy. No ML model has been integrated yet.
3. The example chest-size table is **illustrative**, not brand-specific sizing advice.
4. Checkout is a demo, COD only, with no delivery calculation or payment gateway. Do not use real customer details until privacy/security controls are complete.
5. The product CRUD UI does not yet offer every advanced field or deletion of variants. Order cancellations, logistics and returns are basic.
6. JWTs are stored in `localStorage` for teaching simplicity. Production should prefer secure HttpOnly cookies with CSRF defenses, refresh/session rotation and logout invalidation.
7. Add robust rate limiting, security headers, input-schema validation, audit logging, logging/monitoring, automated DB backups, test coverage and a deployment checklist before operating a live shop.
8. A real garment preview needs licensed 3D GLB/GLTF assets matched to each SKU and size, or a separate garment/fabric simulation pipeline. See `docs/roadmap.md`.

## GitHub — initialize / push

```powershell
git init -b main
git add .
git commit -m "feat: KD Store and 3D Fitting Studio sprint 1"
# Create a private, empty repository named KD-Desgin first
# Replace YOUR_GITHUB_USERNAME with the correct username:
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/KD-Desgin.git
git push -u origin main
```

For ongoing changes:

```powershell
git switch -c feature/real-product-images
# work on the feature
git add .
git commit -m "feat: add approved product photos"
git push -u origin feature/real-product-images
```

Git is **not** a substitute for PostgreSQL backups.

## Useful commands

| Command | Task |
| --- | --- |
| `npm run dev:store` | Store on 5173 |
| `npm run dev:studio` | Studio on 5174 |
| `npm run dev:api` | Express API on 4000 |
| `npm run db:init` | Install database tables |
| `npm run db:seed` | Seed demo catalog and initial admin |
| `npm test` | Size recommendation unit tests |
| `npm run build` | Build both Vite apps |

Detailed business/technical roadmap: [`docs/roadmap.md`](docs/roadmap.md).
