import { fetchRSS } from "../rss.js"
import type { SourceDef } from "../types.js"

export default {
  smzdm: () => fetchRSS("https://post.smzdm.com/feed/"),
} satisfies SourceDef
