import { describe, test, expect } from "bun:test"
import { normalizeNewsItems } from "../src/quality.js"

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
