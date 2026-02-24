import { $fetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

type Res = {
  description: string
  link: string
  pub_date: string
  publisher: string
  title: string
}[]

async function handler(): Promise<NewsItem[]> {
  const res: Res = await $fetch("https://kaopustorage.blob.core.windows.net/news-prod/news_list_hans_0.json")
  return res.filter(k => ["财新", "公视"].every(h => k.publisher !== h)).map((k) => ({
    id: k.link,
    title: k.title,
    pubDate: k.pub_date,
    extra: { hover: k.description, info: k.publisher },
    url: k.link,
  }))
}

export default { kaopu: handler } satisfies SourceDef
