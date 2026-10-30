import test from 'node:test';
import assert from 'node:assert/strict';
import {reportQuery} from '../server/src/adminReports.js';
import {adminPath,adminSection,adminReturnPath} from '../apps/store/src/utils/adminNavigation.js';
test('report queries reject invalid enum, array, page and date input',()=>{
 for(const [kind,query] of [['orders',{page:'0'}],['orders',{page:'1.5'}],['orders',{status:'INVALID'}],['orders',{search:['a','b']}],['inventory',{filter:'oops'}],['best-sellers',{days:'365'}],['catalog-health',{search:'x'.repeat(121)}]]){
  assert.throws(()=>reportQuery(kind,query),error=>error.status===400);
 }
 assert.throws(()=>reportQuery('unknown'),error=>error.status===404);
});
test('search text stays in bound parameters and wildcard characters are literal',()=>{
 const search="abc%_' OR 1=1 --";
 const query=reportQuery('inventory',{search});
 assert.equal(query.source.includes(search),false);
 assert.ok(query.values[0].includes('\\%\\_'));
 assert.match(query.source,/ILIKE \$1/);
});
test('admin URLs preserve filter state and reject external return destinations',()=>{
 assert.equal(adminPath('inventory',{filter:'sold_out',search:'Blue shirt',page:2}),'/admin/inventory?search=Blue+shirt&page=2&filter=sold_out');
 assert.equal(adminSection('/admin/best-sellers'),'best-sellers');
 assert.equal(adminSection('/admin/inventory/unknown'),null);
 assert.equal(adminReturnPath('https://example.com'),'/admin');
 assert.equal(adminReturnPath('/admin/../outside'),'/admin');
 assert.equal(adminReturnPath('/admin/inventory?filter=sold_out'),'/admin/inventory?filter=sold_out');
});
