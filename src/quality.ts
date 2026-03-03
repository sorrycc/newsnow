import type { NewsItem } from "./types.js"

export interface QualityOptions {
  enableDedupe?: boolean
  enableQualityFilter?: boolean
}

export interface QualityStats {
  inputCount: number
  outputCount: number
  droppedInvalid: number
  droppedDuplicate: number
  droppedLowQuality: number
  nonArrayInput: boolean
}

const LOW_QUALITY_PATTERNS = [
  /^(广告|推广|赞助|置顶|热搜|热门|更多|详情|点击查看|查看全文|全文)$/i,
  /^[-_=|#\s]+$/,
  /^\d+$/,
]

function normalizeText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeTitleKey(title: string): string {
  return normalizeText(title)
    .toLowerCase()
    .replace(/[【】\[\]()（）'"`]/g, "")
    .replace(/\s+/g, "")
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  try {
    const u = new URL(trimmed)
    u.hash = ""
    return u.toString()
  } catch {
    return trimmed
  }
}

function isLowQualityTitle(title: string): boolean {
  const t = normalizeText(title)
  if (!t) return true
  if (t.length < 2) return true
  return LOW_QUALITY_PATTERNS.some(p => p.test(t))
}

function normalizeItem(item: NewsItem): NewsItem {
  const title = normalizeText(String(item.title || ""))
  const url = typeof item.url === "string" ? normalizeUrl(item.url) : undefined
  const next: NewsItem = {
    ...item,
    title,
    ...(url ? { url } : {}),
  }

  if (next.extra?.hover && typeof next.extra.hover === "string") {
    next.extra = {
      ...next.extra,
      hover: normalizeText(next.extra.hover),
    }
  }

  if (next.id === undefined || next.id === null || String(next.id).trim() === "") {
    next.id = next.url || title
  }

  return next
}

export function normalizeNewsItems(
  input: unknown,
  opts: QualityOptions = {},
): { items: NewsItem[]; stats: QualityStats } {
  const enableDedupe = opts.enableDedupe !== false
  const enableQualityFilter = opts.enableQualityFilter !== false
  const source = Array.isArray(input) ? input : []

  const stats: QualityStats = {
    inputCount: source.length,
    outputCount: 0,
    droppedInvalid: 0,
    droppedDuplicate: 0,
    droppedLowQuality: 0,
    nonArrayInput: !Array.isArray(input),
  }

  const seenUrl = new Set<string>()
  const seenTitle = new Set<string>()
  const items: NewsItem[] = []

  for (const raw of source) {
    if (!raw || typeof raw !== "object") {
      stats.droppedInvalid++
      continue
    }

    const item = normalizeItem(raw as NewsItem)
    if (!item.title) {
      stats.droppedInvalid++
      continue
    }

    if (enableQualityFilter && isLowQualityTitle(item.title)) {
      stats.droppedLowQuality++
      continue
    }

    const titleKey = normalizeTitleKey(item.title)
    const urlKey = item.url ? normalizeUrl(item.url) : ""
    if (enableDedupe && ((urlKey && seenUrl.has(urlKey)) || seenTitle.has(titleKey))) {
      stats.droppedDuplicate++
      continue
    }

    if (urlKey) seenUrl.add(urlKey)
    seenTitle.add(titleKey)
    items.push(item)
  }

  stats.outputCount = items.length
  return { items, stats }
}
