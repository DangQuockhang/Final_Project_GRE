import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialClock, readTiming } from '../apps/store/src/components/try-on/timing.js';
import { TRY_ON_TIMING } from '../server/src/tryOn.js';

test('old or invalid API limits fail closed instead of promising a longer preview', () => {
    assert.deepEqual(readTiming(TRY_ON_TIMING), TRY_ON_TIMING);
    for (const patch of [{ sessionSeconds: 30 }, { setupSeconds: NaN }, { liveSeconds: 0 }, { sessionSeconds: 300 }, { tokenTtlSeconds: 60 }, { cooldownSeconds: 30 }])
        assert.throws(() => readTiming({ ...TRY_ON_TIMING, ...patch }), /Restart the API/);
    assert.throws(() => readTiming({ sessionSeconds: 30 }), /outdated/);
});

test('45-second preparation leaves 30 seconds of preview', () => {
    let now = 0;
    const clock = createTrialClock(TRY_ON_TIMING, () => now);
    now = 45000;
    assert.deepEqual(clock.snapshot(), { stage: 'setup', remaining: 15, expired: false });
    assert.equal(clock.startLive(), true);
    assert.equal(clock.snapshot().remaining, 30);
    now = 74999; assert.equal(clock.snapshot().expired, false);
    now = 75000; assert.equal(clock.snapshot().expired, true);
});

test('missing AI output expires at 60 seconds and late frames cannot restart it', () => {
    let now = 0;
    const clock = createTrialClock(TRY_ON_TIMING, () => now);
    now = 60000;
    assert.equal(clock.snapshot().expired, true);
    assert.equal(clock.startLive(), false);
    assert.equal(clock.snapshot().stage, 'setup');
});

test('buffering, garment changes and repeated playing never extend the total cap', () => {
    let now = 0;
    const clock = createTrialClock(TRY_ON_TIMING, () => now);
    now = 59999; clock.startLive();
    now = 80000; clock.startLive();
    assert.equal(clock.snapshot().remaining, 10);
    now = 90000;
    assert.equal(clock.snapshot().expired, true);
    assert.equal(clock.startLive(), false);
});
