import type { SourceQualityContext } from "./source-health.js"
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

export type QualityGateHint = "reject" | "review" | "pass"
export type TimestampConfidence = "none" | "low" | "medium" | "high"

export interface ItemQualitySignals {
  title_len: number
  has_url: boolean
  has_pubdate: boolean
  has_hover: boolean
  hover_len: number
  id_stable: boolean
  title_noise_ratio: number
  hover_noise_ratio: number
  low_value_pattern_hit: boolean
  boilerplate_hit: boolean
  source_health_score: number
  fallback_used: boolean
  attempt_error_count: number
  source_profile: string
  age_seconds: number | null
  timestamp_confidence: TimestampConfidence
  dedupe_hit: boolean
  canonical_url: string | null
  cross_source_duplicate_count: number
}

export interface QualityEvaluation {
  item: NewsItem
  source: string
  quality_signals: ItemQualitySignals
  quality_gate_hint: QualityGateHint
  quality_reasons: string[]
}

export interface QualityGateStats {
  total_items: number
  rule_reject_count: number
  review_count: number
  pass_count: number
}

export interface EvaluateQualityOptions {
  sourceProfile: string
  sourceContexts?: Record<string, SourceQualityContext>
  defaultSource?: string
  attachSignals?: boolean
  enableHardReject?: boolean
  nowMs?: number
}

export interface EvaluateQualityResult {
  items: NewsItem[]
  evaluations: QualityEvaluation[]
  stats: QualityGateStats
}

export interface PerSourceQualityStats {
  total_items: number
  rule_reject_count: number
  review_count: number
  pass_count: number
}

export const QUALITY_SCHEMA_VERSION = "1.0.0"

export const QUALITY_POLICY = {
  cli_hard_gate: [
    "empty_title",
    "title_too_short",
    "low_value_pattern",
    "boilerplate_text",
    "non_array_payload",
  ],
  cli_gate_hint_enum: ["reject", "review", "pass"],
  ai_final_decision_enum: ["reject", "downrank", "pass"],
  ai_review_scope: "review_only_or_high_risk",
}

const LOW_QUALITY_PATTERNS = [
  /^(广告|推广|赞助|置顶|热搜|热门|更多|详情|点击查看|查看全文|全文)$/i,
  /^[-_=|#\s]+$/,
  /^\d+$/,
]

const LOW_VALUE_PATTERNS = [
  /^(广告|推广|赞助|置顶|热搜|热门|更多|详情|点击查看|查看全文|全文)$/i,
  /^[-_=|#\s]+$/,
  /^\d+$/,
  /^(点击|查看|详情|阅读全文)/i,
]

const BOILERPLATE_PATTERNS = [
  /^点击查看/i,
  /^查看全文/i,
  /^阅读全文/i,
  /^via\s+/i,
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

export function normalizeUrl(url: string): string {
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

function round(value: number, precision = 4): number {
  const base = 10 ** precision
  return Math.round(value * base) / base
}

function getNoiseRatio(text: string): number {
  const value = normalizeText(text).replace(/\s+/g, "")
  if (!value) return 1
  let noise = 0
  for (const ch of value) {
    if (/[\p{L}\p{N}]/u.test(ch)) continue
    noise++
  }
  return round(noise / value.length)
}

function hasLowValuePattern(text: string): boolean {
  const value = normalizeText(text)
  if (!value) return true
  return LOW_VALUE_PATTERNS.some(p => p.test(value))
}

function hasBoilerplate(text: string): boolean {
  const value = normalizeText(text)
  if (!value) return false
  return BOILERPLATE_PATTERNS.some(p => p.test(value))
}

function parseTimestampMs(value: unknown): { tsMs?: number; confidence: TimestampConfidence } {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const tsMs = value < 1e12 ? value * 1000 : value
    return { tsMs, confidence: "high" }
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return { confidence: "none" }
    const asNum = Number(trimmed)
    if (Number.isFinite(asNum) && asNum > 0) {
      const tsMs = asNum < 1e12 ? asNum * 1000 : asNum
      return { tsMs, confidence: "high" }
    }
    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) {
      return { tsMs: parsed, confidence: "medium" }
    }
    return { confidence: "low" }
  }
  return { confidence: "none" }
}

function getCanonicalUrl(item: NewsItem): string | null {
  if (typeof item.url === "string" && item.url.trim()) return normalizeUrl(item.url)
  return null
}

function getCanonicalKey(item: NewsItem): string {
  const canonicalUrl = getCanonicalUrl(item)
  if (canonicalUrl) return `url:${canonicalUrl}`
  return `title:${normalizeTitleKey(item.title || "")}`
}

function inferSource(item: NewsItem, fallbackSource: string): string {
  if (typeof item.extra?.requestedSource === "string" && item.extra.requestedSource.trim()) {
    return item.extra.requestedSource.trim()
  }
  if (typeof item.extra?.source === "string" && item.extra.source.trim()) {
    return item.extra.source.trim()
  }
  return fallbackSource
}

function buildSignals(
  item: NewsItem,
  opts: {
    source: string
    sourceProfile: string
    sourceContext: SourceQualityContext
    canonicalCount: number
    crossSourceDuplicateCount: number
    nowMs: number
  },
): ItemQualitySignals {
  const title = normalizeText(item.title || "")
  const hover = typeof item.extra?.hover === "string" ? normalizeText(item.extra.hover) : ""
  const canonicalUrl = getCanonicalUrl(item)
  const pub = parseTimestampMs(item.pubDate ?? item.extra?.date)

  let ageSeconds: number | null = null
  if (pub.tsMs !== undefined) {
    ageSeconds = Math.max(0, Math.floor((opts.nowMs - pub.tsMs) / 1000))
  }

  return {
    title_len: title.length,
    has_url: Boolean(canonicalUrl),
    has_pubdate: pub.tsMs !== undefined,
    has_hover: Boolean(hover),
    hover_len: hover.length,
    id_stable: String(item.id || "").trim() !== "" && String(item.id) !== title,
    title_noise_ratio: getNoiseRatio(title),
    hover_noise_ratio: hover ? getNoiseRatio(hover) : 0,
    low_value_pattern_hit: hasLowValuePattern(title),
    boilerplate_hit: hasBoilerplate(hover),
    source_health_score: opts.sourceContext.source_health_score,
    fallback_used: opts.sourceContext.fallback_used,
    attempt_error_count: opts.sourceContext.attempt_error_count,
    source_profile: opts.sourceProfile,
    age_seconds: ageSeconds,
    timestamp_confidence: pub.confidence,
    dedupe_hit: opts.canonicalCount > 1,
    canonical_url: canonicalUrl,
    cross_source_duplicate_count: opts.crossSourceDuplicateCount,
  }
}

function buildGateHint(signals: ItemQualitySignals): { hint: QualityGateHint; reasons: string[] } {
  const rejectReasons: string[] = []
  if (signals.title_len === 0) rejectReasons.push("empty_title")
  if (signals.title_len > 0 && signals.title_len < 4) rejectReasons.push("title_too_short")
  if (signals.low_value_pattern_hit) rejectReasons.push("low_value_pattern")
  if (signals.boilerplate_hit && signals.hover_len < 12) rejectReasons.push("boilerplate_text")
  if (rejectReasons.length) {
    return { hint: "reject", reasons: rejectReasons }
  }

  const reviewReasons: string[] = []
  if (!signals.has_url) reviewReasons.push("missing_url")
  if (!signals.has_pubdate) reviewReasons.push("missing_pubdate")
  if (signals.title_noise_ratio >= 0.45) reviewReasons.push("title_noise_high")
  if (signals.has_hover && signals.hover_noise_ratio >= 0.55) reviewReasons.push("hover_noise_high")
  if (signals.source_health_score < 60) reviewReasons.push("source_health_low")
  if (signals.fallback_used) reviewReasons.push("source_fallback_used")
  if (signals.attempt_error_count > 0) reviewReasons.push("source_attempt_errors")
  if (signals.timestamp_confidence === "low") reviewReasons.push("timestamp_low_confidence")
  if (signals.age_seconds !== null && signals.age_seconds > 7 * 24 * 3600) reviewReasons.push("stale_content")
  if (signals.cross_source_duplicate_count >= 2) reviewReasons.push("cross_source_duplicate")

  if (reviewReasons.length) {
    return { hint: "review", reasons: reviewReasons }
  }

  return { hint: "pass", reasons: [] }
}

export function evaluateQualityForItems(
  inputItems: NewsItem[],
  options: EvaluateQualityOptions,
): EvaluateQualityResult {
  const nowMs = options.nowMs ?? Date.now()
  const sourceContexts = options.sourceContexts || {}
  const defaultSource = options.defaultSource || "unknown"
  const attachSignals = options.attachSignals === true
  const enableHardReject = options.enableHardReject !== false

  const canonicalCount = new Map<string, number>()
  const canonicalSources = new Map<string, Set<string>>()
  const sourceByItem = inputItems.map(item => inferSource(item, defaultSource))

  for (let i = 0; i < inputItems.length; i++) {
    const item = inputItems[i]
    const source = sourceByItem[i]
    const key = getCanonicalKey(item)
    canonicalCount.set(key, (canonicalCount.get(key) || 0) + 1)
    if (!canonicalSources.has(key)) canonicalSources.set(key, new Set())
    canonicalSources.get(key)!.add(source)
  }

  const evaluations: QualityEvaluation[] = []
  const output: NewsItem[] = []
  const stats: QualityGateStats = {
    total_items: inputItems.length,
    rule_reject_count: 0,
    review_count: 0,
    pass_count: 0,
  }

  for (let i = 0; i < inputItems.length; i++) {
    const item = inputItems[i]
    const source = sourceByItem[i]
    const key = getCanonicalKey(item)
    const sourceContext: SourceQualityContext = sourceContexts[source] || {
      source_health_score: 100,
      fallback_used: false,
      attempt_error_count: 0,
      health_status: "healthy",
    }
    const sourceDuplicateCount = (canonicalSources.get(key)?.size || 1) - 1

    const qualitySignals = buildSignals(item, {
      source,
      sourceProfile: options.sourceProfile,
      sourceContext,
      canonicalCount: canonicalCount.get(key) || 1,
      crossSourceDuplicateCount: Math.max(0, sourceDuplicateCount),
      nowMs,
    })
    const gate = buildGateHint(qualitySignals)

    evaluations.push({
      item,
      source,
      quality_signals: qualitySignals,
      quality_gate_hint: gate.hint,
      quality_reasons: gate.reasons,
    })

    if (gate.hint === "reject") stats.rule_reject_count++
    if (gate.hint === "review") stats.review_count++
    if (gate.hint === "pass") stats.pass_count++

    if (gate.hint === "reject" && enableHardReject) {
      continue
    }

    if (attachSignals) {
      output.push({
        ...item,
        quality_signals: qualitySignals,
        quality_gate_hint: gate.hint,
        quality_reasons: gate.reasons,
      } as NewsItem)
    } else {
      output.push(item)
    }
  }

  return {
    items: output,
    evaluations,
    stats,
  }
}

export function summarizeQualityBySource(evaluations: QualityEvaluation[]): Record<string, PerSourceQualityStats> {
  const summary: Record<string, PerSourceQualityStats> = {}
  for (const evaluation of evaluations) {
    if (!summary[evaluation.source]) {
      summary[evaluation.source] = {
        total_items: 0,
        rule_reject_count: 0,
        review_count: 0,
        pass_count: 0,
      }
    }
    const current = summary[evaluation.source]
    current.total_items++
    if (evaluation.quality_gate_hint === "reject") current.rule_reject_count++
    if (evaluation.quality_gate_hint === "review") current.review_count++
    if (evaluation.quality_gate_hint === "pass") current.pass_count++
  }
  return summary
}

export function getQualityRubric() {
  return {
    quality_schema_version: QUALITY_SCHEMA_VERSION,
    quality_policy: QUALITY_POLICY,
    ai_usage_protocol: [
      "1) 调用 newsnow quality-rubric --json 读取 rubric",
      "2) 调用 newsnow feed --json --meta --quality-signals 获取候选与监控",
      "3) 仅对 quality_gate_hint=review 或高风险项做 LLM 判定",
      "4) 输出 reject/downrank/pass 并在 AI 侧执行门控与降权",
    ],
    cli_item_fields: {
      quality_signals: {
        title_len: "number",
        has_url: "boolean",
        has_pubdate: "boolean",
        has_hover: "boolean",
        hover_len: "number",
        id_stable: "boolean",
        title_noise_ratio: "number",
        hover_noise_ratio: "number",
        low_value_pattern_hit: "boolean",
        boilerplate_hit: "boolean",
        source_health_score: "number",
        fallback_used: "boolean",
        attempt_error_count: "number",
        source_profile: "string",
        age_seconds: "number|null",
        timestamp_confidence: "none|low|medium|high",
        dedupe_hit: "boolean",
        canonical_url: "string|null",
        cross_source_duplicate_count: "number",
      },
      quality_gate_hint: "reject|review|pass",
      quality_reasons: "string[]",
    },
    ai_output_schema: {
      type: "object",
      required: ["decision", "reason"],
      properties: {
        decision: {
          type: "string",
          enum: ["reject", "downrank", "pass"],
        },
        reason: { type: "string" },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },
      },
    },
  }
}
