export const orderItemsJson=`COALESCE((SELECT json_agg(json_build_object(
 'product_name',i.product_name,'sku',i.sku,'quantity',i.quantity,
 'unit_price',i.unit_price,'size',i.size,
 'image_url',COALESCE(i.image_url,p.image_url),'slug',COALESCE(i.product_slug,p.slug),
 'brand_name',COALESCE(i.brand_name,b.name),'color',COALESCE(i.color,v.color)
 ) ORDER BY i.id)
 FROM order_items i
 LEFT JOIN product_variants v ON v.id=i.variant_id
 LEFT JOIN products p ON p.id=v.product_id
 LEFT JOIN brands b ON b.id=p.brand_id
 WHERE i.order_id=o.id),'[]'::json)`;
