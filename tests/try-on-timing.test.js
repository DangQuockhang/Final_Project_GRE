import test from 'node:test';
import assert from 'node:assert/strict';
import { readTiming, createSessionTokenProvider } from '../apps/store/src/components/try-on/timing.js';
import { TRY_ON_TIMING } from '../server/src/tryOn.js';

test('manual-stop UI refuses an old time-limited API policy', () => {
    assert.deepEqual(readTiming(TRY_ON_TIMING), TRY_ON_TIMING);
    assert.throws(() => readTiming({setupSeconds:60,liveSeconds:30,sessionSeconds:90}), /Restart the API/);
});
test('long sessions reuse a token and refresh only on demand before expiry', async () => {
    let now=0,calls=0,active=true;
    const get=createSessionTokenProvider(async()=>({...TRY_ON_TIMING,apiKey:'test-'+(++calls)}),()=>active,()=>now);
    assert.equal(await get(),'test-1');assert.equal(await get(),'test-1');
    now=280000;assert.equal(await get(),'test-1');
    now=290000;assert.deepEqual(await Promise.all([get(),get()]),['test-2','test-2']);assert.equal(calls,2);
    now=600000;assert.equal(calls,2,'no timer refresh without an operation');
    active=false;await assert.rejects(get(),/cancelled/);assert.equal(calls,2);
});
test('Stop rejects a late credential result and expired credentials', async () => {
    let resolve,active=true;
    const get=createSessionTokenProvider(()=>new Promise(r=>resolve=r),()=>active,()=>100000);
    const result=get();await Promise.resolve();active=false;resolve({...TRY_ON_TIMING,apiKey:'test'});
    await assert.rejects(result,/cancelled/);
    const expired=createSessionTokenProvider(async()=>({...TRY_ON_TIMING,apiKey:'test',expiresAt:new Date(90000).toISOString()}),()=>true,()=>100000);
    await assert.rejects(expired(),/expired/);
});

