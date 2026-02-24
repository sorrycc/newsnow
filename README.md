# newsnow

[![npm version](https://img.shields.io/npm/v/newsnow.svg)](https://www.npmjs.com/package/newsnow)
[![npm downloads](https://img.shields.io/npm/dm/newsnow.svg)](https://www.npmjs.com/package/newsnow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![clawhub](https://img.shields.io/badge/clawhub-view-blue)](https://clawhub.ai/sorrycc/newsnow)

A command-line tool to fetch trending news and hot topics from 66 sources across 44 platforms. Built with TypeScript, runs on Bun.

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

# List all available sources
newsnow list

# Fetch news from a source
newsnow hackernews

# Output as JSON (pipeable to jq, etc.)
newsnow hackernews --json

# List sources as JSON
newsnow list --json
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

## Dependencies

- [cheerio](https://github.com/cheeriojs/cheerio) - HTML parsing
- [ofetch](https://github.com/unjs/ofetch) - HTTP client
- [dayjs](https://github.com/iamkun/dayjs) - Date formatting
- [iconv-lite](https://github.com/ashtuchkin/iconv-lite) - Character encoding

## License

MIT
