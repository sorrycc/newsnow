import { fetchRSS } from "../rss.js"
import type { SourceDef } from "../types.js"

export default {
  "pcbeta-windows11": () => fetchRSS("https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&auth=0"),
  "pcbeta-windows": () => fetchRSS("https://bbs.pcbeta.com/forum.php?mod=rss&fid=521&auth=0"),
} satisfies SourceDef
