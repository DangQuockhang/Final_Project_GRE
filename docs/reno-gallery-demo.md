# Reno-inspired gallery demo

Branch: `demo/reno-product-gallery`. Based on `feature/sprint-2`; intentionally not merged.

## Run
```sh
npm install
npm run dev:gallery
```
Open http://localhost:5173/gallery-demo.html.

The demo uses the production ProductGallery and ProductEditor components. Local SVG garment illustrations are included, so no product database or external image service is needed. Switch between Storefront and Admin workspace. Choose a star, assign colors, reorder or upload photos, then Save to preview the cover in the storefront. Session state resets on refresh. The demo does not call the API. Brand creation and description persistence are not simulated.

Real product pages use the new gallery on this branch. The real admin retains its existing single transactional Save and backend image validation. No database migration.

Included: left/bottom thumbnail presentation (layout selector is demo-only), mobile thumbnails, swipe, arrows, full-screen viewer, zoom/pan and viewer thumbnails, keyboard navigation/focus containment, immediate draft cover preview, clearer image tiles.

Not included: product video uploads, persisted layout settings, or an exact reproduction of the uploaded video. The source video could not be downloaded in this environment; this version references Reno's official thumbnail/gallery documentation.

## Validation
`npm test` includes a Chrome interaction test when Chrome is installed (CI Ubuntu runner). It verifies cover-first display, explicit color selection, arrows, thumbnails, viewer zoom, and admin cover preview/save. Without Chrome this browser check is skipped. `npm run build` builds the production apps. The demo HTML is a Vite development entry.
