type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, number[]>();
let lastSweepAt = 0;

function compactBuckets(now: number) {
  if (now - lastSweepAt < 60_000) {
    return;
  }

  lastSweepAt = now;
  const oldestAllowedHit = now - 60 * 60 * 1000;

  for (const [key, hits] of buckets.entries()) {
    const activeHits = hits.filter((hitAt) => hitAt > oldestAllowedHit);
    if (activeHits.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, activeHits);
    }
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const value =
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";

  return value.slice(0, 64);
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  compactBuckets(now);

  const windowStart = now - options.windowMs;
  const safeKey = key.slice(0, 160);
  const hits = (buckets.get(safeKey) ?? []).filter((hitAt) => hitAt > windowStart);
  const allowed = hits.length < options.limit;

  if (allowed) {
    hits.push(now);
  }

  buckets.set(safeKey, hits);

  const oldestHit = hits[0] ?? now;
  const resetAt = oldestHit + options.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  return {
    allowed,
    limit: options.limit,
    remaining: Math.max(0, options.limit - hits.length),
    resetAt,
    retryAfterSeconds,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
