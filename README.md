# newsnow

A command-line tool to fetch trending news and hot topics from 66 sources across 44 platforms. Built with TypeScript, runs on Bun.

Ported from [ourongxing/newsnow](https://github.com/ourongxing/newsnow) server sources.

## Install

```bash
bun install
```

## Usage

```bash
# Show help
bun src/cli.ts --help

# List all available sources
bun src/cli.ts list

# Fetch news from a source
bun src/cli.ts hackernews

# Output as JSON (pipeable to jq, etc.)
bun src/cli.ts hackernews --json

# List sources as JSON
bun src/cli.ts list --json
```

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
bun test
```

## Project Structure

```
src/
  cli.ts              # CLI entry point (raw process.argv)
  types.ts            # NewsItem type definitions
  fetch.ts            # HTTP client (ofetch wrapper)
  crypto.ts           # md5, SHA-1, base64 helpers
  utils.ts            # Date parsing utilities
  rss.ts              # RSS feed parser
  sources/
    index.ts          # Source registry (all sources merged)
    baidu.ts          # One file per platform
    bilibili.ts
    cls/              # Multi-file sources
      index.ts
      utils.ts
    coolapk/
      index.ts
    ...
test/
  cli.test.ts
```

## Dependencies

- [cheerio](https://github.com/cheeriojs/cheerio) - HTML parsing
- [ofetch](https://github.com/unjs/ofetch) - HTTP client
- [dayjs](https://github.com/iamkun/dayjs) - Date formatting
- [iconv-lite](https://github.com/ashtuchkin/iconv-lite) - Character encoding

## License

ISC
