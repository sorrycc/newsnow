import type { SourceDef } from "./types.js"

export interface FetchWithFallbackOptions {
  enableFallback?: boolean
}

export interface SourceAttempt {
  source: string
  ok: boolean
  isArray: boolean
  itemCount: number
  durationMs: number
  usedAsFallback: boolean
  error?: string
}

export interface SourceHealth {
  status: "healthy" | "degraded" | "failed"
  score: number
  reason: string
}

export interface SourceQualityContext {
  source_health_score: number
  fallback_used: boolean
  attempt_error_count: number
  health_status: SourceHealth["status"]
}

export interface FetchWithFallbackResult {
  requestedSource: string
  usedSource: string
  items: unknown
  fallbackUsed: boolean
  attempts: SourceAttempt[]
  health: SourceHealth
}

export function buildSourceQualityContext(
  health: SourceHealth,
  attempts: SourceAttempt[],
  fallbackUsed: boolean,
): SourceQualityContext {
  return {
    source_health_score: health.score,
    fallback_used: fallbackUsed,
    attempt_error_count: attempts.filter(a => !a.ok).length,
    health_status: health.status,
  }
}

const SOURCE_FALLBACKS: Record<string, string[]> = {
  "bilibili-ranking": ["bilibili-hot-video", "bilibili-hot-search"],
  "fastbull": ["fastbull-news", "jin10", "mktnews-flash"],
  "fastbull-express": ["fastbull-news", "jin10", "mktnews-flash"],
  "linuxdo": ["v2ex", "github-trending-today", "hackernews"],
  "linuxdo-hot": ["v2ex-share", "github-trending-today"],
  "linuxdo-latest": ["v2ex", "hackernews"],
  "pcbeta-windows": ["pcbeta-windows11"],
  "producthunt": ["hackernews", "github-trending-today"],
  "qqvideo-tv-hotsearch": ["iqiyi-hot-ranklist", "bilibili-hot-video"],
  "smzdm": ["chongbuluo-hot", "kaopu"],
}

function getItemCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0
}

function getFallbackCandidates(name: string, handlers: SourceDef): string[] {
  const exact = SOURCE_FALLBACKS[name] || []
  const prefix = Object.entries(SOURCE_FALLBACKS)
    .filter(([key]) => key.endsWith("*") && name.startsWith(key.replace(/\*$/, "")))
    .flatMap(([, values]) => values)
  const all = [...exact, ...prefix]
  const uniq = Array.from(new Set(all))
  return uniq.filter(k => k !== name && typeof handlers[k] === "function")
}

async function runAttempt(source: string, handler: SourceDef[string], usedAsFallback: boolean): Promise<{ attempt: SourceAttempt; items: unknown }> {
  const start = Date.now()
  try {
    const items = await handler()
    const durationMs = Date.now() - start
    const isArray = Array.isArray(items)
    return {
      items,
      attempt: {
        source,
        ok: true,
        isArray,
        itemCount: getItemCount(items),
        durationMs,
        usedAsFallback,
      },
    }
  } catch (error: any) {
    const durationMs = Date.now() - start
    return {
      items: [],
      attempt: {
        source,
        ok: false,
        isArray: false,
        itemCount: 0,
        durationMs,
        usedAsFallback,
        error: String(error?.message || error),
      },
    }
  }
}

function buildHealth(requestedSource: string, usedSource: string, attempts: SourceAttempt[], fallbackUsed: boolean): SourceHealth {
  const primary = attempts[0]
  const allFailed = attempts.every(a => !a.ok)
  if (allFailed) {
    return {
      status: "failed",
      score: 10,
      reason: `all attempts failed (${requestedSource})`,
    }
  }

  let score = 100
  if (!primary.ok) score -= 55
  if (primary.ok && !primary.isArray) score -= 35
  if (primary.ok && primary.isArray && primary.itemCount === 0) score -= 25
  if (fallbackUsed) score -= 20
  if (primary.durationMs > 2500) score -= 10
  score = Math.max(0, Math.min(100, score))

  if (fallbackUsed) {
    return {
      status: "degraded",
      score,
      reason: `fallback used (${requestedSource} -> ${usedSource})`,
    }
  }

  if (!primary.ok || !primary.isArray || primary.itemCount === 0) {
    return {
      status: "degraded",
      score,
      reason: !primary.ok
        ? `primary source failed (${requestedSource})`
        : (!primary.isArray ? `non-array response (${requestedSource})` : `empty result (${requestedSource})`),
    }
  }

  return {
    status: "healthy",
    score,
    reason: `primary source ok (${requestedSource})`,
  }
}

export async function fetchWithFallback(
  name: string,
  handlers: SourceDef,
  options: FetchWithFallbackOptions = {},
): Promise<FetchWithFallbackResult> {
  const enableFallback = options.enableFallback !== false
  const primaryHandler = handlers[name]
  if (!primaryHandler) {
    throw new Error(`Unknown source "${name}"`)
  }

  const attempts: SourceAttempt[] = []
  const primary = await runAttempt(name, primaryHandler, false)
  attempts.push(primary.attempt)

  const primaryUsable = primary.attempt.ok && primary.attempt.isArray && primary.attempt.itemCount > 0
  if (primaryUsable || !enableFallback) {
    return {
      requestedSource: name,
      usedSource: name,
      items: primary.items,
      fallbackUsed: false,
      attempts,
      health: buildHealth(name, name, attempts, false),
    }
  }

  const candidates = getFallbackCandidates(name, handlers)
  for (const candidate of candidates) {
    const fallback = await runAttempt(candidate, handlers[candidate], true)
    attempts.push(fallback.attempt)
    const usable = fallback.attempt.ok && fallback.attempt.isArray && fallback.attempt.itemCount > 0
    if (usable) {
      return {
        requestedSource: name,
        usedSource: candidate,
        items: fallback.items,
        fallbackUsed: true,
        attempts,
        health: buildHealth(name, candidate, attempts, true),
      }
    }
  }

  return {
    requestedSource: name,
    usedSource: name,
    items: primary.items,
    fallbackUsed: false,
    attempts,
    health: buildHealth(name, name, attempts, false),
  }
}
