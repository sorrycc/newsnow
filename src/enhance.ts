import * as cheerio from "cheerio"
import { myFetch } from "./fetch.js"
import type { NewsItem } from "./types.js"

export interface EnhanceOptions {
  limit?: number
  concurrency?: number
}

export interface EnhanceStats {
  attempted: number
  enhanced: number
  failed: number
  skipped: number
}

const SKIP_HOSTS = new Set([
  "s.weibo.com",
  "top.baidu.com",
  "search.bilibili.com",
  "xueqiu.com",
  "stock.xueqiu.com",
  "news.ycombinator.com",
])

const GENERIC_SITE_SUMMARY_PATTERNS = [
  /新闻网|官网|门户网站/i,
  /互联网平台|致力于|欢迎访问|权威发布/i,
  /copyright|all rights reserved/i,
]

const LOW_VALUE_SUMMARY_PATTERNS = [
  /ICP备|公网安备|沪ICP/i,
  /登录|注册|下载\s*app|iPhone版|Android版/i,
  /隐私政策|用户协议|免责声明/i,
]

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function truncate(text: string, maxLen = 260): string {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1).trimEnd()}…`
}

function isUsableSummary(text: string): boolean {
  if (text.length < 24) return false
  return !LOW_VALUE_SUMMARY_PATTERNS.some(p => p.test(text))
}

function shouldEnhance(url?: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    if (!u.protocol.startsWith("http")) return false
    if (SKIP_HOSTS.has(u.hostname)) return false
    if (/(^|\/)(search|top|trending)(\/|$)/i.test(u.pathname)) return false
    return true
  } catch {
    return false
  }
}

export function extractSummaryFromHtml(html: string): string | undefined {
  const $ = cheerio.load(html)
  const metaSummary = cleanText(
    $("meta[name='description']").attr("content")
      || $("meta[property='og:description']").attr("content")
      || $("meta[name='twitter:description']").attr("content")
      || "",
  )
  const genericMeta = GENERIC_SITE_SUMMARY_PATTERNS.some(p => p.test(metaSummary))
  if (!genericMeta && isUsableSummary(metaSummary)) {
    return truncate(metaSummary)
  }

  const selectors = [
    "article",
    "main article",
    ".article-content",
    ".entry-content",
    ".post-content",
    ".content",
    "main",
  ]

  for (const sel of selectors) {
    const text = cleanText(
      $(sel)
        .first()
        .find("p")
        .slice(0, 6)
        .toArray()
        .map(el => $(el).text())
        .join(" "),
    )
    if (isUsableSummary(text)) {
      return truncate(text)
    }
  }

  const fallback = cleanText(
    $("p")
      .slice(0, 5)
      .toArray()
      .map(el => $(el).text())
      .join(" "),
  )
  if (isUsableSummary(fallback)) {
    return truncate(fallback)
  }
  return undefined
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const result: R[] = new Array(items.length)
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < items.length) {
      const idx = nextIndex++
      result[idx] = await fn(items[idx], idx)
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker())
  await Promise.all(workers)
  return result
}

export async function enhanceNewsItems(
  items: NewsItem[],
  options: EnhanceOptions = {},
): Promise<{ items: NewsItem[]; stats: EnhanceStats }> {
  const limit = Math.max(0, options.limit ?? 5)
  const concurrency = Math.max(1, options.concurrency ?? 3)

  if (!limit || !items.length) {
    return {
      items,
      stats: { attempted: 0, enhanced: 0, failed: 0, skipped: items.length ? 0 : 0 },
    }
  }

  const cloned = items.map(item => ({ ...item, extra: item.extra ? { ...item.extra } : undefined }))
  const candidateIndexes: number[] = []
  let skipped = 0

  for (let i = 0; i < cloned.length; i++) {
    if (candidateIndexes.length >= limit) break
    const item = cloned[i]
    const existingHover = typeof item.extra?.hover === "string" ? cleanText(item.extra.hover) : ""
    if (existingHover.length >= 40) {
      skipped++
      continue
    }
    if (!shouldEnhance(item.url)) {
      skipped++
      continue
    }
    candidateIndexes.push(i)
  }

  let enhanced = 0
  let failed = 0

  await mapLimit(candidateIndexes, concurrency, async (idx) => {
    const item = cloned[idx]
    try {
      const html = await myFetch<string>(item.url!, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        responseType: "text",
      })
      const summary = extractSummaryFromHtml(html)
      if (summary) {
        item.extra = {
          ...(item.extra || {}),
          hover: summary,
          enhanced: true,
        }
        enhanced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  })

  return {
    items: cloned,
    stats: {
      attempted: candidateIndexes.length,
      enhanced,
      failed,
      skipped,
    },
  }
}
