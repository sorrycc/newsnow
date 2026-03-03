export type SourceProfile = "high-quality" | "trending" | "all"

const HIGH_QUALITY_SOURCES: readonly string[] = [
  "thepaper",
  "zaobao",
  "ithome",
  "zhihu",
  "jin10",
  "mktnews",
  "mktnews-flash",
  "cls",
  "cls-depth",
  "cls-telegraph",
  "wallstreetcn",
  "wallstreetcn-news",
  "wallstreetcn-quick",
  "freebuf",
  "sspai",
  "hackernews",
  "github",
  "github-trending-today",
  "v2ex",
  "v2ex-share",
  "solidot",
  "ifeng",
  "cankaoxiaoxi",
  "kaopu",
  "pcbeta-windows11",
]

const TRENDING_SOURCES: readonly string[] = [
  "weibo",
  "toutiao",
  "baidu",
  "douyin",
  "bilibili",
  "bilibili-hot-search",
  "tieba",
  "xueqiu",
  "xueqiu-hotstock",
  "iqiyi-hot-ranklist",
  "qqvideo-tv-hotsearch",
  "douban",
]

export function isSourceProfile(value: string): value is SourceProfile {
  return value === "high-quality" || value === "trending" || value === "all"
}

export function getSourcesByProfile(profile: SourceProfile, allSourceNames: string[]): string[] {
  const all = Array.from(new Set(allSourceNames)).sort()
  if (profile === "all") return all

  const table = profile === "trending" ? TRENDING_SOURCES : HIGH_QUALITY_SOURCES
  const allow = new Set(table)
  return all.filter(name => allow.has(name))
}
