# KD Desgin — Sprint roadmap

## Sprint 1 — Runnable foundation (this starter)

- Monorepo npm workspaces; Store + Studio independent Vite React frontends and shared 3D component.
- Shared PostgreSQL backend, fiction-only seed data.
- Customer flows: catalog, product page, cart, login/register, COD demo orders, order history.
- Admin flows: brands, products, variants, stock and orders.
- Rule-based mannequin feedback based solely on chest ease; interactive 3D rotation, size, stature, color.

**Definition of done for local testing:** all three services boot; unit tests pass; both frontends build; a customer can create an order; admin sees it; stock changes as expected; cancel restores inventory.

## Sprint 2 — Real product media and data quality

- Establish legal inventory source and rights to brand logo, images and descriptions.
- Use storage provider with signed/secure upload workflow and resizing.
- Product photos, variant color assets, style guides, actual size charts per brand/SKU, transparent model measurements.
- Admin import/export CSV, category management, SKU audit trail.
- Centralized product source across both sites, cache invalidation; remove offline fallback from any live deployment.

## Sprint 3 — Mannequin v1

- Hire/license 3D mannequin models; integrate GLTF/GLB via `useGLTF` and assets served via CDN.
- Provide distinct mannequin base meshes/shapes, test clipping and morph targets.
- Digitize garments with permissions and size-specific fit mesh per garment, with accurate construction data.
- Show honest advisory size notes and expose size chart with ease margins.

## Sprint 4 — AI sizing research

- Gather consented fit outcomes: customer body measurements (optional), SKU actual chart, kept/returned and fit ratings.
- Compare ML predictions against the rule-based baseline with holdout testing.
- Explain recommendation confidence; never claim precise physical fit unless validated.
- Minimize/anonymize user measurements, implement deletion and retention policies.

## Sprint 5 — Store readiness

- HttpOnly server sessions, rate limits, audit logs, schema validation, threat model and tests.
- Shipping rate quotations, order lifecycle, returns/refunds, real inventory reconciliation.
- Official domestic payment gateway, tax/invoice/accounting decisions, privacy policy and compliance reviews.
- Cloud deployment, HTTPS, environment management, uptime monitoring, PostgreSQL backups and restore drill.

## Important business gate

Do not represent fictional labels as official partners. Before first real sale: supplier contract/legally valid source; invoice and origin controls; trademark/media permissions; available stock; actual cost structure; customer service; consumer-rights and e-commerce obligations.
