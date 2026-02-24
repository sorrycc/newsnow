import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  data: {
    ClusterIdStr: string
    Title: string
    LabelUri?: { url: string }
  }[]
}

async function handler(): Promise<NewsItem[]> {
  const url = "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc"
  const res: Res = await myFetch(url)
  return res.data.map((k) => ({
    id: k.ClusterIdStr,
    title: k.Title,
    url: `https://www.toutiao.com/trending/${k.ClusterIdStr}/`,
    extra: { icon: k.LabelUri?.url },
  }))
}

export default { toutiao: handler } satisfies SourceDef
