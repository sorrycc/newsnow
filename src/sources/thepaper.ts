import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  data: {
    hotNews: {
      contId: string
      name: string
    }[]
  }
}

async function handler(): Promise<NewsItem[]> {
  const url = "https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar"
  const res: Res = await myFetch(url)
  return res.data.hotNews.map((k) => ({
    id: k.contId,
    title: k.name,
    url: `https://www.thepaper.cn/newsDetail_forward_${k.contId}`,
    mobileUrl: `https://m.thepaper.cn/newsDetail_forward_${k.contId}`,
  }))
}

export default { thepaper: handler } satisfies SourceDef
