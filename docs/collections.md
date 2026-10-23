# Product types and collections

After pulling this update, run `npm run db:init` once before restarting the API and storefront. This adds the collections table and product link, normalizes existing product types, and backfills collections. Existing products and order history are retained. Running the initializer again preserves hidden flags.

In Add/Edit Product, enter a Product Type or select a suggestion. Names use sentence case (`CHARM → Charm`, `SHirt → Shirt`, `T-SHIRT → T-shirt`) with repeated spaces collapsed. Saving creates or reuses a collection within the selected category. A database trigger applies the same rule to all product write routes and rolls it back if saving fails.

Admin → Collections shows total and active product counts. Hide/Show controls customer navigation. Delete is available only when no products, including drafts and archived products, reference the collection. Move those products to another type or hide the collection if its history should remain.

Customer Collections and Product Type filters use the public registry. Hidden collections and collections with no active products are omitted automatically. Sold-out active products still belong to a nonempty collection. Hiding a collection removes its navigation entry; it does not unpublish its products from All Products.

Verification: unit tests cover normalization, suggestions, and menu grouping. PostgreSQL integration tests cover concurrent duplicate names, visibility, authorization, moving types/categories, protected deletion, and rollback.
