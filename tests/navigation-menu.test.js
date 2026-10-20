import test from 'node:test';
import assert from 'node:assert/strict';
import {isOutsidePanel} from '../apps/store/src/utils/navigationMenu.js';

function region(ids){
 return {contains(target){return ids.includes(target?.id)}};
}
const trigger=region(['trigger','trigger-icon']);
const panel=region(['panel','item','inner-label']);

test('clicks inside the toggle or submenu do not close it',()=>{
 for(const id of ['trigger','trigger-icon','panel','item','inner-label']){
  assert.equal(isOutsidePanel({id},trigger,panel),false,id);
 }
});

test('clicking content outside a menu closes the active submenu',()=>{
 for(const id of ['homepage','product-card','footer','other-navbar-link','search-button']){
  assert.equal(isOutsidePanel({id},trigger,panel),true,id);
 }
});
test('transient panel refs do not prevent outside dismissal',()=>{
 assert.equal(isOutsidePanel({id:'body'},trigger,null),true);
 assert.equal(isOutsidePanel(null,trigger,panel),false);
});
