// Timing comes from the server that scopes the provider token. Refuse an old API
// instead of showing a longer trial while its token still has a 30-second cap.
export function readTiming(body) {
    const keys = ['setupSeconds', 'liveSeconds', 'sessionSeconds', 'tokenTtlSeconds', 'cooldownSeconds'];
    const timing = Object.fromEntries(keys.map(key => [key, body?.[key]]));
    if (Object.values(timing).some(value => !Number.isInteger(value) || value <= 0)
        || timing.setupSeconds > 120 || timing.liveSeconds > 60
        || timing.sessionSeconds !== timing.setupSeconds + timing.liveSeconds
        || timing.tokenTtlSeconds < timing.sessionSeconds || timing.tokenTtlSeconds > 300
        || timing.cooldownSeconds < timing.sessionSeconds || timing.cooldownSeconds > 300) {
        throw Error('Trial timing is unavailable or outdated. Restart the API after updating, then check the connection again.');
    }
    return timing;
}

export function createTrialClock(timing, now = () => Date.now()) {
    const startedAt = now();
    const setupEnd = startedAt + timing.setupSeconds * 1000;
    const hardEnd = startedAt + timing.sessionSeconds * 1000;
    let liveAt = null;
    return {
        startLive() {
            // Playing can fire again after buffering or a garment change.
            // Neither event may reset the preview allowance or the hard cap.
            if (liveAt === null && now() < setupEnd) liveAt = now();
            return liveAt !== null && now() < Math.min(hardEnd, liveAt + timing.liveSeconds * 1000);
        },
        snapshot() {
            const end = liveAt === null ? Math.min(setupEnd, hardEnd) : Math.min(hardEnd, liveAt + timing.liveSeconds * 1000);
            return {
                stage: liveAt === null ? 'setup' : 'live',
                remaining: Math.max(0, Math.ceil((end - now()) / 1000)),
                expired: now() >= end,
            };
        },
    };
}
