---
name: newsnow
description: |
  CLI tool to fetch trending news and hot topics from 66 sources across 44 platforms. Returns structured news items with titles, URLs, metadata, and optional health/enhancement diagnostics.

  USE FOR:
  - Fetching high-quality news feeds and trending/hot topics
  - Monitoring hot topics across social media, tech, finance, and news sites
  - Getting structured feed data as JSON for further processing
  - Listing sources by profile (`high-quality`, `trending`, `all`)

  Requires npm install. Some sources need env vars (PRODUCTHUNT_API_TOKEN). Some sources may be blocked by Cloudflare (linuxdo), but CLI supports automatic fallback by default.
allowed-tools:
  - Bash(newsnow *)
  - Bash(npx newsnow *)
---

# newsnow CLI

Fetch trending news and hot topics from 66 sources across 44 platforms. Returns news items with title, URL, and optional metadata.

Run `newsnow --help` for usage details.

## Workflow

Follow this pattern:

1. **Profile** - Pick a source profile (`high-quality` default, `trending`, or `all`).
2. **List or Feed** - Use `list` to inspect source names, or `feed` to aggregate many sources.
3. **Source Fetch** - If you need one source only, call `newsnow <source>`.
4. **Diagnostics / Enrichment** - Use `--meta` for health/quality diagnostics; use `--enhance` for summary enrichment.
5. **AI Quality Signals** - Use `quality-rubric --json` + `--quality-signals` to feed AI judge inputs.

| Need | Command | When |
|---|---|---|
| See default high-quality sources | `newsnow list` | Quick source discovery |
| See all sources | `newsnow list --profile all` | Need full registry |
| Aggregate default feed | `newsnow feed` | Want multi-source readable feed |
| Aggregate trending feed | `newsnow feed --profile trending` | Want hot-topic stream |
| See feed diagnostics | `newsnow feed --json --meta` | Need fallback/quality stats |
| Get AI quality rubric | `newsnow quality-rubric --json` | Need fixed LLM decision rubric/schema |
| Get AI-ready feed signals | `newsnow feed --json --meta --quality-signals` | Need per-item quality signals + run monitor |
| Get news | `newsnow <source>` | Know the source, want readable output |
| Get news as JSON | `newsnow <source> --json` | Need structured data for processing |
| Enrich summary text | `newsnow <source> --json --enhance --enhance-limit 5` | Need better `extra.hover` coverage |

## Commands

### list

List sources by profile.

```bash
newsnow list
newsnow list --profile all
newsnow list --json
```

### feed

Aggregate multiple sources into one feed.

```bash
newsnow feed
newsnow feed --profile trending
newsnow feed --profile all --limit 100 --per-source 2
newsnow feed --json --meta
newsnow feed --json --meta --quality-signals
```

### quality-rubric

```bash
newsnow quality-rubric --json
```

### Fetch a source

```bash
newsnow hackernews
newsnow hackernews --json
newsnow linuxdo --json --meta
newsnow thepaper --json --enhance --enhance-limit 5
```

Output fields (JSON mode):
- `id` - Unique item identifier
- `title` - News headline
- `url` - Link to the article (optional)
- `pubDate` - Publication date (optional)
- `extra` - Additional metadata like view counts, comments (optional)

When `--meta` is enabled (JSON mode), output wraps `items` with diagnostics:
- `sourceUsed`, `fallbackUsed`, `health`, `attempts`
- `quality` stats (dedupe/filter counts)
- `enhance` stats when `--enhance` is enabled
- `quality_schema_version`, `quality_monitor`, `quality_policy`

When `--quality-signals` is enabled (JSON mode), each item adds:
- `quality_signals`
- `quality_gate_hint` (`reject|review|pass`)
- `quality_reasons`

AI final decision enum (outside CLI): `reject|downrank|pass`

## Sources

66 source endpoints across 44 platforms:

| Platform | Sources |
|---|---|
| 36kr | `36kr`, `36kr-quick`, `36kr-renqi` |
| Baidu | `baidu` |
| Bilibili | `bilibili`, `bilibili-hot-search`, `bilibili-hot-video`, `bilibili-ranking` |
| Cankaoxiaoxi | `cankaoxiaoxi` |
| Chongbuluo | `chongbuluo`, `chongbuluo-hot`, `chongbuluo-latest` |
| CLS | `cls`, `cls-telegraph`, `cls-depth`, `cls-hot` |
| Coolapk | `coolapk` |
| Douban | `douban` |
| Douyin | `douyin` |
| Fastbull | `fastbull`, `fastbull-express`, `fastbull-news` |
| FreeBuf | `freebuf` |
| Gelonghui | `gelonghui` |
| Ghxi | `ghxi` |
| GitHub | `github`, `github-trending-today` |
| Hacker News | `hackernews` |
| Hupu | `hupu` |
| iFeng | `ifeng` |
| iQIYI | `iqiyi-hot-ranklist` |
| ITHome | `ithome` |
| Jin10 | `jin10` |
| Juejin | `juejin` |
| Kaopu | `kaopu` |
| Kuaishou | `kuaishou` |
| LinuxDo | `linuxdo`, `linuxdo-latest`, `linuxdo-hot` |
| MktNews | `mktnews`, `mktnews-flash` |
| Nowcoder | `nowcoder` |
| PCBeta | `pcbeta-windows`, `pcbeta-windows11` |
| Product Hunt | `producthunt` |
| QQ Video | `qqvideo-tv-hotsearch` |
| SMZDM | `smzdm` |
| Solidot | `solidot` |
| Sputnik News CN | `sputniknewscn` |
| SSPai | `sspai` |
| Steam | `steam` |
| Tencent | `tencent-hot` |
| The Paper | `thepaper` |
| Tieba | `tieba` |
| Toutiao | `toutiao` |
| V2EX | `v2ex`, `v2ex-share` |
| Wall Street CN | `wallstreetcn`, `wallstreetcn-quick`, `wallstreetcn-news`, `wallstreetcn-hot` |
| Weibo | `weibo` |
| Xueqiu | `xueqiu`, `xueqiu-hotstock` |
| Zaobao | `zaobao` |
| Zhihu | `zhihu` |

## Source Selection Guide

| Category | Recommended Sources |
|---|---|
| Tech | `hackernews`, `github`, `v2ex`, `juejin`, `ithome`, `linuxdo` |
| Finance | `xueqiu`, `wallstreetcn`, `cls`, `jin10`, `gelonghui`, `fastbull` |
| General News | `toutiao`, `baidu`, `thepaper`, `ifeng`, `zaobao`, `cankaoxiaoxi` |
| Social/Trending | `weibo`, `douyin`, `bilibili`, `zhihu`, `tieba`, `douban` |
| Security | `freebuf` |
| Product/Design | `producthunt`, `sspai` |

## Environment Variables

- `PRODUCTHUNT_API_TOKEN` - Required for `producthunt` source

## Known Limitations

- `linuxdo`, `linuxdo-latest`, `linuxdo-hot` may return 403 Forbidden (Cloudflare)
- Some Chinese sources may be inaccessible from outside mainland China

## Working with Results

```bash
newsnow hackernews --json | jq '.[].title'
newsnow hackernews --json | jq '.[:5]'
newsnow weibo --json | jq '.[] | "\(.title) \(.url)"'
newsnow feed --json --meta | jq '.reports'
newsnow feed --profile high-quality --json | jq '.[:10]'
```
