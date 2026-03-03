# newsnow

[![npm version](https://img.shields.io/npm/v/newsnow.svg)](https://www.npmjs.com/package/newsnow)
[![npm downloads](https://img.shields.io/npm/dm/newsnow.svg)](https://www.npmjs.com/package/newsnow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![clawhub](https://img.shields.io/badge/clawhub-view-blue)](https://clawhub.ai/sorrycc/newsnow)

A command-line tool to fetch trending news and hot topics from 66 sources across 44 platforms. Built with TypeScript, runs on Bun.

Now includes quality-first defaults:
- `list` and `feed` default to a curated `high-quality` source profile
- automatic source fallback for blocked/empty sources
- optional article summary enhancement (`--enhance`)

Ported from [ourongxing/newsnow](https://github.com/ourongxing/newsnow) server sources.

## Install

```bash
npm install -g newsnow
```

Or use directly with npx:

```bash
npx newsnow
```

## Usage

```bash
# Show help
newsnow --help

# List sources (default profile: high-quality)
newsnow list

# List all sources
newsnow list --profile all

# Aggregate feed from multiple sources (default profile: high-quality)
newsnow feed

# Aggregate feed from trending profile
newsnow feed --profile trending

# Fetch news from a source
newsnow hackernews

# Output as JSON (pipeable to jq, etc.)
newsnow hackernews --json

# Include fetch/quality/enhance metadata in JSON mode
newsnow hackernews --json --meta

# Enhance summary text by fetching article pages
newsnow thepaper --json --enhance --enhance-limit 5
```

## Commands

### list

List sources by profile. Default profile is `high-quality`.

```bash
newsnow list
newsnow list --profile all
newsnow list --profile trending --json
```

### feed

Aggregate multiple sources into one feed.

```bash
newsnow feed
newsnow feed --profile all --limit 100 --per-source 2
newsnow feed --json --meta
```

### source fetch

Fetch a single source.

```bash
newsnow hackernews
newsnow hackernews --json
newsnow linuxdo --json --meta
```

## Profiles

- `high-quality` (default): editorial/news-readability oriented sources
- `trending`: hot-topic/trending style sources
- `all`: all registered sources

## Common Options

- `--json` Output JSON
- `--meta` Include fetch/quality/enhance metadata (JSON mode)
- `--raw` Disable dedupe/quality filtering
- `--enhance` Fetch article pages and enrich `extra.hover`
- `--enhance-limit <n>` Max items to enhance per source (default: `5`)
- `--no-fallback` Disable automatic source fallback
- `--profile <high-quality|trending|all>` Source profile for `list`/`feed`
- `--all` Shortcut for `--profile all`
- `--limit <n>` Max total items in `feed` mode (default: `120`)
- `--per-source <n>` Max items per source in `feed` mode (default: `8`)
- `--concurrency <n>` Fetch concurrency in `feed` mode (default: `4`)

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

Some sources require environment variables:

- `producthunt` requires `PRODUCTHUNT_API_TOKEN`

Some sources may be blocked by Cloudflare or require authentication:

- `linuxdo`, `linuxdo-latest`, `linuxdo-hot` - May return 403 Forbidden

## Testing

```bash
bun run test
```

## Dependencies

- [cheerio](https://github.com/cheeriojs/cheerio) - HTML parsing
- [ofetch](https://github.com/unjs/ofetch) - HTTP client
- [dayjs](https://github.com/iamkun/dayjs) - Date formatting
- [iconv-lite](https://github.com/ashtuchkin/iconv-lite) - Character encoding

## License

MIT
