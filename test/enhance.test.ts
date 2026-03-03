import { describe, expect, test } from "bun:test"
import { enhanceNewsItems, extractSummaryFromHtml } from "../src/enhance.js"

describe("extractSummaryFromHtml", () => {
  test("prefers meta description", () => {
    const html = `
      <html>
        <head>
          <meta name="description" content="This is a concise article summary from metadata." />
        </head>
        <body><article><p>Body text</p></article></body>
      </html>
    `
    const summary = extractSummaryFromHtml(html)
    expect(summary).toContain("concise article summary")
  })

  test("falls back to article paragraph text", () => {
    const html = `
      <html>
        <body>
          <article>
            <p>This paragraph has enough useful details for an extracted summary.</p>
            <p>Second paragraph.</p>
          </article>
        </body>
      </html>
    `
    const summary = extractSummaryFromHtml(html)
    expect(summary).toContain("useful details")
  })

  test("ignores generic site-level meta summary", () => {
    const html = `
      <html>
        <head>
          <meta name="description" content="某新闻网是最活跃的互联网平台，致力于提供权威发布。" />
        </head>
        <body>
          <article>
            <p>This is the actual article summary from body paragraphs with concrete details.</p>
          </article>
        </body>
      </html>
    `
    const summary = extractSummaryFromHtml(html)
    expect(summary).toContain("actual article summary")
  })

  test("rejects footer-like low-value summary text", () => {
    const html = `
      <html>
        <body>
          <p>登录 Android版 iPhone版 沪ICP备14003370号 沪公网安备31010602000299号</p>
        </body>
      </html>
    `
    const summary = extractSummaryFromHtml(html)
    expect(summary).toBeUndefined()
  })
})

describe("enhanceNewsItems", () => {
  test("is no-op when list is empty", async () => {
    const result = await enhanceNewsItems([], { limit: 5 })
    expect(result.items).toEqual([])
    expect(result.stats.attempted).toBe(0)
    expect(result.stats.enhanced).toBe(0)
  })

  test("counts skipped items when enhance limit is zero", async () => {
    const result = await enhanceNewsItems([
      { id: "1", title: "a", url: "https://example.com/a" },
      { id: "2", title: "b", url: "https://example.com/b" },
    ], { limit: 0 })
    expect(result.stats.attempted).toBe(0)
    expect(result.stats.skipped).toBe(2)
  })
})
