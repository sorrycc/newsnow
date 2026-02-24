import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"
import { tranformToUTC } from "../utils.js"

interface Res {
  list: {
    data: {
      id: string
      title: string
      url: string
      publishTime: string
    }
  }[]
}

async function handler(): Promise<NewsItem[]> {
  const res = await Promise.all(
    ["zhongguo", "guandian", "gj"].map(k =>
      myFetch(`https://china.cankaoxiaoxi.com/json/channel/${k}/list.json`) as Promise<Res>,
    ),
  )
  return res.map(k => k.list).flat().map(k => ({
    id: k.data.id,
    title: k.data.title,
    extra: { date: tranformToUTC(k.data.publishTime) },
    url: k.data.url,
  })).sort((m, n) => (m.extra.date as number) < (n.extra.date as number) ? 1 : -1)
}

export default { cankaoxiaoxi: handler } satisfies SourceDef
