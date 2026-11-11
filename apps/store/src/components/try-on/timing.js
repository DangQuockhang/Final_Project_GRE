// A token expires; an already established AI session does not stop when it does.
export function readTiming(body) {
    if (body?.sessionMode !== 'manual-stop' || !Number.isInteger(body.tokenTtlSeconds)
        || body.tokenTtlSeconds < 60 || body.tokenTtlSeconds > 300
        || !Number.isInteger(body.cooldownSeconds) || body.cooldownSeconds < 1 || body.cooldownSeconds > 300) {
        throw Error('Session policy is outdated. Restart the API after updating, then check the connection again.');
    }
    return {sessionMode: body.sessionMode, tokenTtlSeconds: body.tokenTtlSeconds, cooldownSeconds: body.cooldownSeconds};
}

// Refresh only when an active SDK operation needs a credential. No background
// refresh, reconnect or provider session is started by this cache.
export function createSessionTokenProvider(request, isActive, now = () => Date.now()) {
    let cached, pending;
    return async () => {
        if (!isActive()) throw Error('Session cancelled.');
        if (cached && now() < cached.expires - 15000) return cached.apiKey;
        if (!pending) {
            const requestedAt = now();
            pending = Promise.resolve().then(request).then(data => {
                const policy = readTiming(data);
                if (typeof data.apiKey !== 'string' || !data.apiKey) throw Error('The server returned an invalid session token.');
                const reportedExpiry = Date.parse(data.expiresAt);
                cached = {
                    apiKey: data.apiKey,
                    expires: Math.min(requestedAt + policy.tokenTtlSeconds * 1000, Number.isFinite(reportedExpiry) ? reportedExpiry : Infinity),
                };
                if (cached.expires <= now() + 15000) { cached = null; throw Error('The server returned an expired session token. Check the server clock.'); }
                return cached.apiKey;
            }).finally(() => { pending = null; });
        }
        const key = await pending;
        if (!isActive()) { cached = null; throw Error('Session cancelled.'); }
        return key;
    };
}

