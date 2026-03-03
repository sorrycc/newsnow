import { describe, test, expect } from "bun:test"
import {
  evaluateQualityForItems,
  getQualityRubric,
  normalizeNewsItems,
  QUALITY_SCHEMA_VERSION,
} from "../src/quality.js"

describe("normalizeNewsItems", () => {
  test("handles non-array input", () => {
    const { items, stats } = normalizeNewsItems(null)
    expect(items).toEqual([])
    expect(stats.nonArrayInput).toBe(true)
  })

  test("dedupes by url and title", () => {
    const { items, stats } = normalizeNewsItems([
      { id: "1", title: "Hello World", url: "https://example.com/a#x" },
      { id: "2", title: "Hello World", url: "https://example.com/b" },
      { id: "3", title: "Another", url: "https://example.com/a" },
    ])
    expect(items.length).toBe(1)
    expect(stats.droppedDuplicate).toBe(2)
  })

  test("filters obviously low-quality titles", () => {
    const { items, stats } = normalizeNewsItems([
      { id: "1", title: "广告", url: "https://example.com/ad" },
      { id: "2", title: "AI", url: "https://example.com/ai" },
      { id: "3", title: "-", url: "https://example.com/dash" },
    ])
    expect(items.length).toBe(1)
    expect(items[0].title).toBe("AI")
    expect(stats.droppedLowQuality).toBe(2)
  })
})

describe("evaluateQualityForItems", () => {
  test("attaches signals and gate hints", () => {
    const result = evaluateQualityForItems([
      {
        id: "abc",
        title: "OpenAI released a new research update",
        url: "https://example.com/a",
        pubDate: Date.now(),
        extra: { hover: "Model eval and benchmark details." },
      },
    ], {
      sourceProfile: "high-quality",
      sourceContexts: {
        sourceA: {
          source_health_score: 88,
          fallback_used: false,
          attempt_error_count: 0,
          health_status: "healthy",
        },
      },
      defaultSource: "sourceA",
      attachSignals: true,
    })

    expect(result.items.length).toBe(1)
    const item = result.items[0] as any
    expect(item.quality_signals).toBeDefined()
    expect(item.quality_gate_hint).toBeDefined()
    expect(Array.isArray(item.quality_reasons)).toBe(true)
  })

  test("hard rejects low value titles", () => {
    const result = evaluateQualityForItems([
      { id: "1", title: "广告", url: "https://example.com/ad" },
      { id: "2", title: "值得阅读的技术文章", url: "https://example.com/ok" },
    ], {
      sourceProfile: "high-quality",
      defaultSource: "demo",
      enableHardReject: true,
    })

    expect(result.stats.rule_reject_count).toBe(1)
    expect(result.items.length).toBe(1)
    expect(result.items[0].title).toContain("值得阅读")
  })
})

describe("quality rubric", () => {
  test("returns fixed schema", () => {
    const rubric = getQualityRubric() as any
    expect(rubric.quality_schema_version).toBe(QUALITY_SCHEMA_VERSION)
    expect(rubric.quality_policy).toBeDefined()
    expect(rubric.ai_output_schema?.properties?.decision?.enum).toContain("downrank")
  })
})
