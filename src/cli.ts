#!/usr/bin/env bun
import { enhanceNewsItems, type EnhanceStats } from "./enhance.js"
import {
  evaluateQualityForItems,
  getQualityRubric,
  normalizeNewsItems,
  QUALITY_POLICY,
  QUALITY_SCHEMA_VERSION,
  summarizeQualityBySource,
  type PerSourceQualityStats,
  type QualityGateStats,
  type QualityStats,
} from "./quality.js"
import { sources } from "./sources/index.js"
import { getSourcesByProfile, isSourceProfile, type SourceProfile } from "./source-profiles.js"
import {
  buildSourceQualityContext,
  fetchWithFallback,
  type SourceQualityContext,
} from "./source-health.js"
import type { NewsItem } from "./types.js"

interface ParsedCliArgs {
  command?: string
  json: boolean
  raw: boolean
  meta: boolean
  qualitySignals: boolean
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
  qualityGate: QualityGateStats
  qualityBySource: PerSourceQualityStats
  sourceQualityContext: SourceQualityContext
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

interface QualityMonitorSource {
  source: string
  source_used?: string
  item_count: number
  rule_reject_rate: number
  health_status: "healthy" | "degraded" | "failed"
  fallback_used: boolean
}

interface QualityMonitor {
  total_items: number
  rule_reject_count: number
  review_count: number
  pass_count: number
  degraded_source_count: number
  fallback_source_count: number
  avg_source_health_score: number
  sources: QualityMonitorSource[]
  quality_alerts: string[]
}

function requireOptionValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`)
  }
  return value
}

function parsePositiveIntStrict(value: string, flag: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid value for ${flag}: ${value}`)
  }
  return Math.floor(n)
}

function parseCliArgs(argv: string[]): ParsedCliArgs {
  let json = false
  let raw = false
  let meta = false
  let qualitySignals = false
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
    if (arg === "--quality-signals") {
      qualitySignals = true
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
      const value = requireOptionValue(argv, i, "--enhance-limit")
      enhanceLimit = parsePositiveIntStrict(value, "--enhance-limit")
      i++
      continue
    }
    if (arg === "--profile") {
      const p = requireOptionValue(argv, i, "--profile")
      if (!isSourceProfile(p)) {
        throw new Error(`Invalid value for --profile: ${p}`)
      }
      profile = p
      i++
      continue
    }
    if (arg === "--limit") {
      const value = requireOptionValue(argv, i, "--limit")
      feedLimit = parsePositiveIntStrict(value, "--limit")
      i++
      continue
    }
    if (arg === "--per-source") {
      const value = requireOptionValue(argv, i, "--per-source")
      perSource = parsePositiveIntStrict(value, "--per-source")
      i++
      continue
    }
    if (arg === "--concurrency") {
      const value = requireOptionValue(argv, i, "--concurrency")
      feedConcurrency = parsePositiveIntStrict(value, "--concurrency")
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
    qualitySignals,
    enhance,
    enhanceLimit,
    noFallback,
    profile,
    feedLimit,
    perSource,
    feedConcurrency,
  }
}

let parsedArgs: ParsedCliArgs
try {
  parsedArgs = parseCliArgs(process.argv.slice(2))
} catch (error: any) {
  console.error(`Error: ${String(error?.message || error)}`)
  process.exit(1)
}
const command = parsedArgs.command

function printHelp() {
  console.log(`Usage: newsnow <source> [--json]
       newsnow list [--json] [--profile high-quality|trending|all]
       newsnow feed [--json] [--profile high-quality|trending|all]
       newsnow quality-rubric --json

Commands:
  list          List available sources (default profile: high-quality)
  feed          Aggregate multiple sources into one feed (default profile: high-quality)
  quality-rubric  Print fixed quality rubric/schema for AI judges
  <source>      Fetch news from a single source

Options:
  --json        Output as JSON
  --meta        JSON mode only, include fetch/quality/enhance metadata
  --quality-signals JSON mode only, append quality_signals/gate fields to each item
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

function printQualityRubric() {
  const rubric = getQualityRubric()
  console.log(JSON.stringify(rubric, null, 2))
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

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 10000) / 10000
}

function aggregateSourceMonitor(result: ProcessedSourceResult): {
  source: QualityMonitorSource
  totalItems: number
  ruleRejectCount: number
  reviewCount: number
  passCount: number
  healthScore: number
} {
  const totalItems = result.quality.inputCount + (result.quality.nonArrayInput ? 1 : 0)
  const ruleRejectCount = result.quality.droppedInvalid
    + result.quality.droppedLowQuality
    + result.qualityGate.rule_reject_count
    + (result.quality.nonArrayInput ? 1 : 0)

  return {
    source: {
      source: result.requestedSource,
      source_used: result.usedSource,
      item_count: totalItems,
      rule_reject_rate: toRate(ruleRejectCount, Math.max(1, totalItems)),
      health_status: result.sourceQualityContext.health_status,
      fallback_used: result.fallbackUsed,
    },
    totalItems,
    ruleRejectCount,
    reviewCount: result.qualityGate.review_count,
    passCount: result.qualityGate.pass_count,
    healthScore: result.sourceQualityContext.source_health_score,
  }
}

function buildQualityAlerts(monitor: QualityMonitor): string[] {
  const alerts: string[] = []
  const rejectRate = toRate(monitor.rule_reject_count, Math.max(1, monitor.total_items))
  if (monitor.degraded_source_count > 0) {
    alerts.push(`degraded_source_count:${monitor.degraded_source_count}`)
  }
  if (monitor.fallback_source_count > 0) {
    alerts.push(`fallback_source_count:${monitor.fallback_source_count}`)
  }
  if (rejectRate >= 0.3) {
    alerts.push(`high_rule_reject_rate:${rejectRate}`)
  }
  const badSources = monitor.sources
    .filter(item => item.rule_reject_rate >= 0.4)
    .map(item => `${item.source}:${item.rule_reject_rate}`)
  if (badSources.length) {
    alerts.push(`source_reject_rate_spike:${badSources.join(",")}`)
  }
  return alerts
}

async function fetchProcessedSource(
  name: string,
  options: {
    sourceProfile: string
    attachSignals: boolean
  },
): Promise<ProcessedSourceResult> {
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

  const sourceQualityContext = buildSourceQualityContext(
    fetched.health,
    fetched.attempts,
    fetched.fallbackUsed,
  )
  const qualityEvaluated = evaluateQualityForItems(items, {
    sourceProfile: options.sourceProfile,
    sourceContexts: {
      [fetched.usedSource]: sourceQualityContext,
    },
    defaultSource: fetched.usedSource,
    attachSignals: options.attachSignals,
    enableHardReject: !parsedArgs.raw,
  })
  items = qualityEvaluated.items
  const qualityBySource = summarizeQualityBySource(qualityEvaluated.evaluations)[fetched.usedSource] || {
    total_items: 0,
    rule_reject_count: 0,
    review_count: 0,
    pass_count: 0,
  }

  return {
    requestedSource: fetched.requestedSource,
    usedSource: fetched.usedSource,
    fallbackUsed: fetched.fallbackUsed,
    health: fetched.health,
    attempts: fetched.attempts,
    quality: qualityStats,
    qualityGate: qualityEvaluated.stats,
    qualityBySource,
    sourceQualityContext,
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
    const result = await fetchProcessedSource(name, {
      sourceProfile: "single-source",
      attachSignals: parsedArgs.json && parsedArgs.qualitySignals,
    })
    if (!parsedArgs.json && result.quality.nonArrayInput) {
      console.error(`Warning: source "${result.usedSource}" returned a non-array payload; treated as empty list.`)
    }

    const sourceAgg = aggregateSourceMonitor(result)
    const qualityMonitor: QualityMonitor = {
      total_items: sourceAgg.totalItems,
      rule_reject_count: sourceAgg.ruleRejectCount,
      review_count: sourceAgg.reviewCount,
      pass_count: sourceAgg.passCount,
      degraded_source_count: sourceAgg.source.health_status === "healthy" ? 0 : 1,
      fallback_source_count: result.fallbackUsed ? 1 : 0,
      avg_source_health_score: sourceAgg.healthScore,
      sources: [sourceAgg.source],
      quality_alerts: [],
    }
    qualityMonitor.quality_alerts = buildQualityAlerts(qualityMonitor)

    if (parsedArgs.json) {
      const includeQualityEnvelope = parsedArgs.meta || parsedArgs.qualitySignals
      if (!includeQualityEnvelope) {
        console.log(JSON.stringify(result.items, null, 2))
        return
      }

      const payload: Record<string, unknown> = {
        source: result.requestedSource,
        sourceUsed: result.usedSource,
        fallbackUsed: result.fallbackUsed,
        items: result.items,
        quality_schema_version: QUALITY_SCHEMA_VERSION,
        quality_monitor: qualityMonitor,
        quality_policy: QUALITY_POLICY,
      }
      if (parsedArgs.meta) {
        payload.health = result.health
        payload.attempts = result.attempts
        payload.quality = result.quality
        payload.enhance = result.enhance
      }
      console.log(JSON.stringify(payload, null, 2))
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
      const result = await fetchProcessedSource(name, {
        sourceProfile: parsedArgs.profile,
        attachSignals: false,
      })
      return { name, result }
    } catch (error: any) {
      return { name, error: String(error?.message || error) }
    }
  })

  const reports: FeedSourceReport[] = []
  const collected: NewsItem[] = []
  const sourceContexts: Record<string, SourceQualityContext> = {}
  const qualitySources: QualityMonitorSource[] = []
  const healthScores: number[] = []
  let sourceRuleRejectCount = 0
  let sourceTotalItems = 0
  for (const item of settled) {
    if ("error" in item) {
      reports.push({
        source: item.name,
        status: "failed",
        itemCount: 0,
        error: item.error,
      })
      qualitySources.push({
        source: item.name,
        item_count: 0,
        rule_reject_rate: 1,
        health_status: "failed",
        fallback_used: false,
      })
      healthScores.push(0)
      continue
    }

    const result = item.result
    sourceContexts[result.usedSource] = result.sourceQualityContext
    sourceContexts[result.requestedSource] = result.sourceQualityContext
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

    const sourceAggregate = aggregateSourceMonitor(result)
    qualitySources.push(sourceAggregate.source)
    healthScores.push(sourceAggregate.healthScore)
    sourceRuleRejectCount += sourceAggregate.ruleRejectCount
    sourceTotalItems += sourceAggregate.totalItems
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
  const feedSliced = sorted.slice(0, parsedArgs.feedLimit)
  const evaluatedFeed = evaluateQualityForItems(feedSliced, {
    sourceProfile: parsedArgs.profile,
    sourceContexts,
    defaultSource: "feed",
    attachSignals: parsedArgs.json && parsedArgs.qualitySignals,
    enableHardReject: !parsedArgs.raw,
  })
  const items = evaluatedFeed.items

  const totalItems = sourceTotalItems
  const ruleRejectCount = sourceRuleRejectCount
    + merged.stats.droppedInvalid
    + merged.stats.droppedLowQuality
    + (merged.stats.nonArrayInput ? 1 : 0)
    + evaluatedFeed.stats.rule_reject_count
  const degradedSourceCount = qualitySources.filter(item => item.health_status !== "healthy").length
  const fallbackSourceCount = qualitySources.filter(item => item.fallback_used).length
  const avgSourceHealthScore = healthScores.length
    ? Math.round((healthScores.reduce((sum, n) => sum + n, 0) / healthScores.length) * 100) / 100
    : 0
  const qualityMonitor: QualityMonitor = {
    total_items: totalItems,
    rule_reject_count: ruleRejectCount,
    review_count: evaluatedFeed.stats.review_count,
    pass_count: evaluatedFeed.stats.pass_count,
    degraded_source_count: degradedSourceCount,
    fallback_source_count: fallbackSourceCount,
    avg_source_health_score: avgSourceHealthScore,
    sources: qualitySources,
    quality_alerts: [],
  }
  qualityMonitor.quality_alerts = buildQualityAlerts(qualityMonitor)

  if (parsedArgs.json) {
    const includeQualityEnvelope = parsedArgs.meta || parsedArgs.qualitySignals
    if (!includeQualityEnvelope) {
      console.log(JSON.stringify(items, null, 2))
      return
    }

    const payload: Record<string, unknown> = {
      mode: "feed",
      profile: parsedArgs.profile,
      requestedSourceCount: profileSources.length,
      items,
      quality_schema_version: QUALITY_SCHEMA_VERSION,
      quality_monitor: qualityMonitor,
      quality_policy: QUALITY_POLICY,
    }
    if (parsedArgs.meta) {
      payload.reports = reports
      payload.quality = merged.stats
    }
    console.log(JSON.stringify(payload, null, 2))
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
} else if (command === "quality-rubric") {
  printQualityRubric()
} else if (command === "feed") {
  fetchFeed()
} else {
  fetchSource(command)
}
