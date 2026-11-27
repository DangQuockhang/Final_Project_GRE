// Translate only the exact legacy system-generated status note.
// Free-text administrator notes remain unchanged.
export function orderActivityReason(item){
 const status=item?.after_state?.status;
 const states=['CONFIRMED','SHIPPED','DELIVERED','CANCELLED'];
 if(item?.action==='STATUS'&&states.includes(status)&&item.reason==='Cập nhật trạng thái đơn: '+status){
  return 'Order status updated: '+status;
 }
 return item?.reason||'';
}
