import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardWindow} from '../server/src/dashboard.js';
test('dashboard periods follow Vietnam midnight and compare equal elapsed durations',()=>{
 const w=dashboardWindow('7',new Date('2026-10-28T18:30:00Z'));
 assert.equal(w.start.toISOString(),'2026-10-22T17:00:00.000Z');
 assert.equal(w.end.toISOString(),'2026-10-28T18:30:00.000Z');
 assert.equal(w.previousStart.toISOString(),'2026-10-15T17:00:00.000Z');
 assert.equal(w.end-w.start,w.previousEnd-w.previousStart);
});
test('dashboard rejects unbounded or invalid reporting periods',()=>{
 for(const value of ['0','365','all','30 OR 1=1',null,[]])assert.throws(()=>dashboardWindow(value),/7, 30 or 90/);
 assert.equal(dashboardWindow(undefined).days,30);
});
