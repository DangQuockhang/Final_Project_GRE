import test from 'node:test';
import assert from 'node:assert/strict';
import {orderActivityReason} from '../apps/store/src/utils/orderActivity.js';
test('legacy system status notes display in English without changing stored records',()=>{
 const item={action:'STATUS',reason:'Cập nhật trạng thái đơn: DELIVERED',after_state:{status:'DELIVERED'}};
 assert.equal(orderActivityReason(item),'Order status updated: DELIVERED');
 assert.equal(item.reason,'Cập nhật trạng thái đơn: DELIVERED');
});
test('administrator notes and unknown historical formats remain unchanged',()=>{
 for(const item of [{action:'PAYMENT',reason:'Đã kiểm tra tiền'},{action:'STATUS',reason:'Ghi chú của admin',after_state:{status:'DELIVERED'}},{action:'STATUS',reason:'Cập nhật trạng thái đơn: SHIPPED',after_state:{status:'DELIVERED'}}])assert.equal(orderActivityReason(item),item.reason);
});
