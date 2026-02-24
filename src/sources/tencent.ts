import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface WapRes {
  data: {
    tabs: {
      articleList: {
        id: string
        title: string
        desc: string
        link_info: { url: string }
      }[]
    }[]
  }
}

const comprehensiveNews = async (): Promise<NewsItem[]> => {
  const url = "https://i.news.qq.com/web_backend/v2/getTagInfo?tagId=aEWqxLtdgmQ%3D"
  const res = await myFetch<WapRes>(url, {
    headers: { Referer: "https://news.qq.com/" },
  })
  return res.data.tabs[0].articleList.map(news => ({
    id: news.id,
    title: news.title,
    url: news.link_info.url,
    extra: { hover: news.desc },
  }))
}

export default { "tencent-hot": comprehensiveNews } satisfies SourceDef
