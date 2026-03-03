import { describe, expect, test } from "bun:test"
import type { SourceDef } from "../src/types.js"
import { buildSourceQualityContext, fetchWithFallback } from "../src/source-health.js"

describe("fetchWithFallback", () => {
  test("uses fallback when primary fails", async () => {
    const handlers: SourceDef = {
      linuxdo: async () => {
        throw new Error("403 Forbidden")
      },
      v2ex: async () => [{ id: "1", title: "ok", url: "https://example.com/1" }],
      "github-trending-today": async () => [{ id: "2", title: "ok2", url: "https://example.com/2" }],
      hackernews: async () => [{ id: "3", title: "ok3", url: "https://example.com/3" }],
    }
    const result = await fetchWithFallback("linuxdo", handlers)
    expect(result.fallbackUsed).toBe(true)
    expect(result.usedSource).not.toBe("linuxdo")
    expect(Array.isArray(result.items)).toBe(true)
    expect(result.health.status).toBe("degraded")
  })

  test("keeps primary when it is healthy", async () => {
    const handlers: SourceDef = {
      demo: async () => [{ id: "1", title: "ok", url: "https://example.com/1" }],
    }
    const result = await fetchWithFallback("demo", handlers)
    expect(result.fallbackUsed).toBe(false)
    expect(result.usedSource).toBe("demo")
    expect(result.health.status).toBe("healthy")
  })

  test("respects no-fallback mode", async () => {
    const handlers: SourceDef = {
      linuxdo: async () => {
        throw new Error("blocked")
      },
      v2ex: async () => [{ id: "1", title: "ok", url: "https://example.com/1" }],
      "github-trending-today": async () => [{ id: "2", title: "ok2", url: "https://example.com/2" }],
      hackernews: async () => [{ id: "3", title: "ok3", url: "https://example.com/3" }],
    }
    const result = await fetchWithFallback("linuxdo", handlers, { enableFallback: false })
    expect(result.fallbackUsed).toBe(false)
    expect(result.usedSource).toBe("linuxdo")
    expect(result.health.status).toBe("failed")
  })

  test("maps source quality context fields", () => {
    const ctx = buildSourceQualityContext(
      { status: "degraded", score: 42, reason: "fallback used" },
      [
        { source: "a", ok: false, isArray: false, itemCount: 0, durationMs: 100, usedAsFallback: false, error: "blocked" },
        { source: "b", ok: true, isArray: true, itemCount: 2, durationMs: 120, usedAsFallback: true },
      ],
      true,
    )
    expect(ctx.source_health_score).toBe(42)
    expect(ctx.fallback_used).toBe(true)
    expect(ctx.attempt_error_count).toBe(1)
    expect(ctx.health_status).toBe("degraded")
  })
})
