// Only metadata is read. A reachable but empty/legacy database is not ready.
export const requiredSchema = {
 users: ['id','name','email','phone','avatar_url','status','token_version'],
 brands: ['id','name','logo_url'],
 products: ['id','status','image_url','sale_price','product_type','collection_id','size_guide_image_url','detail_blocks'],
 product_variants: ['id','color_hex'], product_images: ['id','color'],
 collections: ['id','hidden'], brand_size_guides: ['brand_id','category','image_url'],
 orders: ['id','order_code','payment_status'], order_items: ['id','image_url','product_slug','brand_name','color'],
 product_deletion_audit: ['id'], password_reset_tokens: ['id'], auth_rate_limits: [],
 account_default_addresses: ['user_id'], auth_revoked_tokens: ['token_hash'],
 membership_tiers: ['code'], order_action_audit: ['id'], schema_migrations: ['version'],
};

export async function inspectDatabase(query) {
 const {rows} = await query(`SELECT table_name, column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name = ANY($1::text[])`, [Object.keys(requiredSchema)]);
 const found = new Map();
 for (const row of rows) {
  if (!found.has(row.table_name)) found.set(row.table_name, new Set());
  found.get(row.table_name).add(row.column_name);
 }
 const missingTables = [], missingColumns = [];
 for (const [table, columns] of Object.entries(requiredSchema)) {
  if (!found.has(table)) missingTables.push(table);
  else for (const column of columns) if (!found.get(table).has(column)) missingColumns.push(`${table}.${column}`);
 }
 return {ready: !missingTables.length && !missingColumns.length, missingTables, missingColumns};
}

export function databaseHealthHandler(query) {
 return async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
   const schema = await inspectDatabase(query);
   if (!schema.ready) return res.status(503).json({ok:false,service:'kd-api',code:'DATABASE_SCHEMA_NOT_READY',
    error:'The database is connected, but its required schema is missing or outdated.'});
   return res.json({ok:true,service:'kd-api'});
  } catch {
   return res.status(503).json({ok:false,service:'kd-api',code:'DATABASE_UNAVAILABLE',
    error:'The database connection is unavailable.'});
  }
 };
}
