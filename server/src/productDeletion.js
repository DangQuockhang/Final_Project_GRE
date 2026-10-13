/** Decide whether an inventory record may be permanently deleted. */
export function evaluateProductDeletion({status,stock=0,orderItems=0}={}){
 const quantity=Number(stock),orders=Number(orderItems);
 if(!['draft','archived'].includes(status))return {eligible:false,reason:'Archive or move this product to Draft before deleting it.'};
 if(!Number.isFinite(quantity)||quantity!==0)return {eligible:false,reason:'Set stock to 0 for every SKU before permanently deleting.'};
 if(!Number.isFinite(orders)||orders>0)return {eligible:false,reason:'This product has order history. Keep it Archived instead.'};
 return {eligible:true,reason:'No stock or order history. Permanent deletion is allowed.'};
}
