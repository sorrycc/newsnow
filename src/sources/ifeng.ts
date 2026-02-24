import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const html: string = await myFetch("https://www.ifeng.com/")
  const regex = /var\s+allData\s*=\s*(\{[\s\S]*?\});/
  const match = regex.exec(html)
  const news: NewsItem[] = []
  if (match) {
    const realData = JSON.parse(match[1])
    const rawNews = realData.hotNews1 as { url: string; title: string; newsTime: string }[]
    rawNews.forEach((hotNews) => {
      news.push({
        id: hotNews.url,
        url: hotNews.url,
        title: hotNews.title,
        extra: { date: hotNews.newsTime },
      })
    })
  }
  return news
}

export default { ifeng: handler } satisfies SourceDef
