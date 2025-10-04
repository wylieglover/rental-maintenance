// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type LimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// ─────────────────────────────────────────────────────────────
// Optional Upstash client (only if env vars are present)
// ─────────────────────────────────────────────────────────────
const HAVE_UPSTASH =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redisClient = HAVE_UPSTASH
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

const upstashDefault = HAVE_UPSTASH
  ? new Ratelimit({
      redis: redisClient!,
      limiter: Ratelimit.slidingWindow(20, '5 m'),
    })
  : null

// ─────────────────────────────────────────────────────────────
// Simple in-memory fallback (single process only)
// ─────────────────────────────────────────────────────────────
const mem = new Map<
  string,
  { count: number; reset: number; windowMs: number; limit: number }
>()

function memLimit(
  key: string,
  limit = 20,
  windowSec = 300
): LimitResult {
  const now = Date.now()
  const windowMs = windowSec * 1000
  const entry = mem.get(key)

  if (!entry || now >= entry.reset) {
    const reset = now + windowMs
    mem.set(key, { count: 1, reset, windowMs, limit })
    return { success: true, limit, remaining: limit - 1, reset }
  }

  if (entry.count >= entry.limit) {
    return { success: false, limit: entry.limit, remaining: 0, reset: entry.reset }
  }

  entry.count++
  return {
    success: true,
    limit: entry.limit,
    remaining: entry.limit - entry.count,
    reset: entry.reset,
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
export async function limit(
  key: string,
  opts?: { window?: number; limit?: number }
): Promise<LimitResult> {
  const l = opts?.limit ?? 20
  const w = opts?.window ?? 300

  if (HAVE_UPSTASH) {
    const limiter =
      opts
        ? new Ratelimit({
            redis: redisClient!,
            limiter: Ratelimit.slidingWindow(l, `${w} s`),
          })
        : upstashDefault!
    const r = await limiter.limit(key)
    return {
      success: r.success,
      limit: r.limit,
      remaining: r.remaining,
      reset: r.reset,
    }
  }

  // Fallback: single-process memory limiter
  return memLimit(key, l, w)
}
