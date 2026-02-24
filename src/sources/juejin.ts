import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  data: {
    content: {
      title: string
      content_id: string
    }
  }[]
}

async function handler(): Promise<NewsItem[]> {
  const url = `https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0`
  const res: Res = await myFetch(url)
  return res.data.map((k) => ({
    id: k.content.content_id,
    title: k.content.title,
    url: `https://juejin.cn/post/${k.content.content_id}`,
  }))
}

export default { juejin: handler } satisfies SourceDef
