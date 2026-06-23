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
let lastPersistentSweepAt = 0;

async function getPersistentRateLimitClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const { createHash } = await import("node:crypto");
    const { createSupabaseServiceClient } = await import("../supabase/service");

    return {
      hashKey(value: string) {
        return createHash("sha256").update(value).digest("hex");
      },
      serviceClient: createSupabaseServiceClient(),
    };
  } catch {
    return null;
  }
}

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

export async function checkRateLimitAsync(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const persistent = await getPersistentRateLimitClient();
  if (!persistent) {
    return checkRateLimit(key, options);
  }

  const now = Date.now();
  const safeKey = persistent.hashKey(key.slice(0, 160));
  const windowStartIso = new Date(now - options.windowMs).toISOString();

  try {
    if (now - lastPersistentSweepAt > 60_000) {
      lastPersistentSweepAt = now;
      await persistent.serviceClient
        .from("rate_limit_events")
        .delete()
        .lt("hit_at", new Date(now - 60 * 60 * 1000).toISOString());
    }

    await persistent.serviceClient.from("rate_limit_events").insert({ bucket_key: safeKey });

    const [{ count, error: countError }, { data: oldestHit, error: oldestError }] = await Promise.all([
      persistent.serviceClient
        .from("rate_limit_events")
        .select("id", { count: "exact", head: true })
        .eq("bucket_key", safeKey)
        .gt("hit_at", windowStartIso),
      persistent.serviceClient
        .from("rate_limit_events")
        .select("hit_at")
        .eq("bucket_key", safeKey)
        .gt("hit_at", windowStartIso)
        .order("hit_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (countError || oldestError) {
      return checkRateLimit(key, options);
    }

    const hitCount = count ?? 0;
    const oldestHitAt = typeof oldestHit?.hit_at === "string" ? new Date(oldestHit.hit_at).getTime() : now;
    const resetAt = oldestHitAt + options.windowMs;
    const allowed = hitCount <= options.limit;

    return {
      allowed,
      limit: options.limit,
      remaining: Math.max(0, options.limit - hitCount),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  } catch {
    return checkRateLimit(key, options);
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
