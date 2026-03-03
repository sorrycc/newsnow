#!/usr/bin/env bun
import { enhanceNewsItems, type EnhanceStats } from "./enhance.js"
import { normalizeNewsItems, type QualityStats } from "./quality.js"
import { sources } from "./sources/index.js"
import { getSourcesByProfile, isSourceProfile, type SourceProfile } from "./source-profiles.js"
import { fetchWithFallback } from "./source-health.js"
import type { NewsItem } from "./types.js"

interface ParsedCliArgs {
  command?: string
  json: boolean
  raw: boolean
  meta: boolean
  enhance: boolean
  enhanceLimit: number
  noFallback: boolean
  profile: SourceProfile
  feedLimit: number
  perSource: number
  feedConcurrency: number
}

interface ProcessedSourceResult {
  requestedSource: string
  usedSource: string
  fallbackUsed: boolean
  health: {
    status: "healthy" | "degraded" | "failed"
    score: number
    reason: string
  }
  attempts: any[]
  quality: QualityStats
  enhance?: EnhanceStats
  items: NewsItem[]
}

interface FeedSourceReport {
  source: string
  sourceUsed?: string
  fallbackUsed?: boolean
  status: "ok" | "failed"
  health?: string
  itemCount: number
  error?: string
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

function parseCliArgs(argv: string[]): ParsedCliArgs {
  let json = false
  let raw = false
  let meta = false
  let enhance = false
  let noFallback = false
  let enhanceLimit = 5
  let profile: SourceProfile = "high-quality"
  let feedLimit = 120
  let perSource = 8
  let feedConcurrency = 4
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--json") {
      json = true
      continue
    }
    if (arg === "--raw") {
      raw = true
      continue
    }
    if (arg === "--meta") {
      meta = true
      continue
    }
    if (arg === "--enhance") {
      enhance = true
      continue
    }
    if (arg === "--no-fallback") {
      noFallback = true
      continue
    }
    if (arg === "--all") {
      profile = "all"
      continue
    }
    if (arg === "--enhance-limit") {
      enhanceLimit = parsePositiveInt(argv[i + 1], enhanceLimit)
      i++
      continue
    }
    if (arg === "--profile") {
      const p = argv[i + 1] || ""
      if (isSourceProfile(p)) profile = p
      i++
      continue
    }
    if (arg === "--limit") {
      feedLimit = parsePositiveInt(argv[i + 1], feedLimit)
      i++
      continue
    }
    if (arg === "--per-source") {
      perSource = parsePositiveInt(argv[i + 1], perSource)
      i++
      continue
    }
    if (arg === "--concurrency") {
      feedConcurrency = parsePositiveInt(argv[i + 1], feedConcurrency)
      i++
      continue
    }
    positional.push(arg)
  }

  return {
    command: positional[0],
    json,
    raw,
    meta,
    enhance,
    enhanceLimit,
    noFallback,
    profile,
    feedLimit,
    perSource,
    feedConcurrency,
  }
}

const parsedArgs = parseCliArgs(process.argv.slice(2))
const command = parsedArgs.command

function printHelp() {
  console.log(`Usage: newsnow <source> [--json]
       newsnow list [--json] [--profile high-quality|trending|all]
       newsnow feed [--json] [--profile high-quality|trending|all]

Commands:
  list          List available sources (default profile: high-quality)
  feed          Aggregate multiple sources into one feed (default profile: high-quality)
  <source>      Fetch news from a single source

Options:
  --json        Output as JSON
  --meta        JSON mode only, include fetch/quality/enhance metadata
  --raw         Disable dedupe/quality filtering
  --enhance     Fetch article pages and enrich summary text (extra.hover)
  --enhance-limit <n>  Max items to enhance per source (default: 5)
  --no-fallback Disable automatic source fallback when source fails/empty
  --profile <name>  Source profile for list/feed: high-quality|trending|all
  --all         Shortcut for --profile all
  --limit <n>   Max total items in feed mode (default: 120)
  --per-source <n>  Max items kept per source in feed mode (default: 8)
  --concurrency <n> Feed fetch concurrency (default: 4)

Total sources: ${Object.keys(sources).length}.`)
}

function printList() {
  const allNames = Object.keys(sources).sort()
  const names = getSourcesByProfile(parsedArgs.profile, allNames)
  if (parsedArgs.json) {
    console.log(JSON.stringify(names, null, 2))
    return
  }

  console.log(`Available sources (${names.length}) [profile: ${parsedArgs.profile}]:\n`)
  const groups: Record<string, string[]> = {}
  for (const name of names) {
    const base = name.split("-")[0]
    if (!groups[base]) groups[base] = []
    groups[base].push(name)
  }
  for (const [base, items] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
    if (items.length === 1) {
      console.log(`  ${items[0]}`)
    } else {
      console.log(`  ${base}: ${items.join(", ")}`)
    }
  }

  if (parsedArgs.profile !== "all") {
    console.log(`\nUse "--profile all" to view all ${allNames.length} sources.`)
  }
}

function suggestSimilar(input: string): string[] {
  const names = Object.keys(sources)
  return names.filter(n =>
    n.includes(input) || input.includes(n) || levenshtein(n, input) <= 3,
  ).slice(0, 5)
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0),
      )
  return dp[m][n]
}

function toTimestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const asNum = Number(value)
    if (Number.isFinite(asNum) && asNum > 0) return asNum
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const result: R[] = new Array(items.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++
      result[idx] = await fn(items[idx], idx)
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => worker(),
  )
  await Promise.all(workers)
  return result
}

async function fetchProcessedSource(name: string): Promise<ProcessedSourceResult> {
  const fetched = await fetchWithFallback(name, sources, {
    enableFallback: !parsedArgs.noFallback,
  })

  const { items: normalizedItems, stats: qualityStats } = normalizeNewsItems(fetched.items, {
    enableDedupe: !parsedArgs.raw,
    enableQualityFilter: !parsedArgs.raw,
  })

  let items = normalizedItems
  let enhanceStats: EnhanceStats | undefined
  if (parsedArgs.enhance) {
    const enhanced = await enhanceNewsItems(items, {
      limit: parsedArgs.enhanceLimit,
    })
    items = enhanced.items
    enhanceStats = enhanced.stats
  }

  return {
    requestedSource: fetched.requestedSource,
    usedSource: fetched.usedSource,
    fallbackUsed: fetched.fallbackUsed,
    health: fetched.health,
    attempts: fetched.attempts,
    quality: qualityStats,
    enhance: enhanceStats,
    items,
  }
}

async function fetchSource(name: string) {
  const handler = sources[name]
  if (!handler) {
    const similar = suggestSimilar(name)
    console.error(`Error: Unknown source "${name}"`)
    if (similar.length) console.error(`Did you mean: ${similar.join(", ")}?`)
    process.exit(1)
  }

  try {
    const result = await fetchProcessedSource(name)
    if (!parsedArgs.json && result.quality.nonArrayInput) {
      console.error(`Warning: source "${result.usedSource}" returned a non-array payload; treated as empty list.`)
    }

    if (parsedArgs.json) {
      if (parsedArgs.meta) {
        console.log(JSON.stringify({
          source: result.requestedSource,
          sourceUsed: result.usedSource,
          fallbackUsed: result.fallbackUsed,
          health: result.health,
          attempts: result.attempts,
          quality: result.quality,
          enhance: result.enhance,
          items: result.items,
        }, null, 2))
      } else {
        console.log(JSON.stringify(result.items, null, 2))
      }
      return
    }

    if (!result.items.length) {
      console.log("No items found.")
      return
    }

    const sourceLabel = result.fallbackUsed
      ? `${result.requestedSource} -> ${result.usedSource}`
      : result.usedSource
    console.log(`\n${sourceLabel} (${result.items.length} items)\n${"─".repeat(60)}`)
    for (const [i, item] of result.items.entries()) {
      const parts = [`${String(i + 1).padStart(3)}. ${item.title}`]
      if (item.url) parts.push(`     ${item.url}`)
      if (item.extra?.info && typeof item.extra.info === "string") parts.push(`     ${item.extra.info}`)
      console.log(parts.join("\n"))
    }

    if (result.health.status !== "healthy") {
      console.log(`\nSource health: ${result.health.status} (score ${result.health.score}) - ${result.health.reason}`)
    }
    if (!parsedArgs.raw && (result.quality.droppedDuplicate || result.quality.droppedLowQuality || result.quality.droppedInvalid)) {
      const filtered = result.quality.droppedDuplicate + result.quality.droppedLowQuality + result.quality.droppedInvalid
      console.log(`\nFiltered ${filtered} item(s): ${result.quality.droppedDuplicate} duplicate, ${result.quality.droppedLowQuality} low-quality, ${result.quality.droppedInvalid} invalid.`)
    }
    if (parsedArgs.enhance && result.enhance) {
      console.log(`\nEnhanced ${result.enhance.enhanced}/${result.enhance.attempted} item(s), failed ${result.enhance.failed}, skipped ${result.enhance.skipped}.`)
    }
  } catch (err: any) {
    console.error(`Error fetching "${name}": ${err.message}`)
    process.exit(1)
  }
}

async function fetchFeed() {
  const allNames = Object.keys(sources).sort()
  const profileSources = getSourcesByProfile(parsedArgs.profile, allNames)
  if (!profileSources.length) {
    console.error(`Error: profile "${parsedArgs.profile}" has no available sources.`)
    process.exit(1)
  }

  const settled = await mapLimit(profileSources, parsedArgs.feedConcurrency, async (name) => {
    try {
      const result = await fetchProcessedSource(name)
      return { name, result }
    } catch (error: any) {
      return { name, error: String(error?.message || error) }
    }
  })

  const reports: FeedSourceReport[] = []
  const collected: NewsItem[] = []
  for (const item of settled) {
    if ("error" in item) {
      reports.push({
        source: item.name,
        status: "failed",
        itemCount: 0,
        error: item.error,
      })
      continue
    }

    const result = item.result
    const picked = result.items.slice(0, parsedArgs.perSource).map(news => ({
      ...news,
      extra: {
        ...(news.extra || {}),
        source: result.usedSource,
        requestedSource: result.requestedSource,
      },
    }))
    collected.push(...picked)
    const status = result.health.status === "failed" || picked.length === 0 ? "failed" : "ok"
    reports.push({
      source: result.requestedSource,
      sourceUsed: result.usedSource,
      fallbackUsed: result.fallbackUsed,
      status,
      health: `${result.health.status}:${result.health.score}`,
      itemCount: picked.length,
    })
  }

  const merged = normalizeNewsItems(collected, {
    enableDedupe: !parsedArgs.raw,
    enableQualityFilter: !parsedArgs.raw,
  })

  const sorted = [...merged.items].sort((a, b) => {
    const ta = toTimestamp(a.pubDate ?? a.extra?.date) ?? 0
    const tb = toTimestamp(b.pubDate ?? b.extra?.date) ?? 0
    return tb - ta
  })
  const items = sorted.slice(0, parsedArgs.feedLimit)

  if (parsedArgs.json) {
    if (parsedArgs.meta) {
      console.log(JSON.stringify({
        mode: "feed",
        profile: parsedArgs.profile,
        requestedSourceCount: profileSources.length,
        reports,
        quality: merged.stats,
        items,
      }, null, 2))
    } else {
      console.log(JSON.stringify(items, null, 2))
    }
    return
  }

  if (!items.length) {
    console.log("No items found.")
    return
  }

  console.log(`\nfeed:${parsedArgs.profile} (${items.length} items)\n${"─".repeat(60)}`)
  for (const [i, item] of items.entries()) {
    const src = typeof item.extra?.source === "string" ? `[${item.extra.source}] ` : ""
    const parts = [`${String(i + 1).padStart(3)}. ${src}${item.title}`]
    if (item.url) parts.push(`     ${item.url}`)
    if (item.extra?.info && typeof item.extra.info === "string") parts.push(`     ${item.extra.info}`)
    console.log(parts.join("\n"))
  }
}

if (!command || command === "help" || command === "--help" || command === "-h") {
  printHelp()
} else if (command === "list") {
  printList()
} else if (command === "feed") {
  fetchFeed()
} else {
  fetchSource(command)
}
