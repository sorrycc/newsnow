import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Item {
  uri: string
  id: number
  title?: string
  content_text: string
  content_short: string
  display_time: number
  type?: string
}

const live = async (): Promise<NewsItem[]> => {
  const apiUrl = `https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30`
  const res: any = await myFetch(apiUrl)
  return res.data.items.map((k: Item) => ({
    id: k.id,
    title: k.title || k.content_text,
    extra: { date: k.display_time * 1000 },
    url: k.uri,
  }))
}

const news = async (): Promise<NewsItem[]> => {
  const apiUrl = `https://api-one.wallstcn.com/apiv1/content/information-flow?channel=global-channel&accept=article&limit=30`
  const res: any = await myFetch(apiUrl)
  return res.data.items
    .filter((k: any) => k.resource_type !== "theme" && k.resource_type !== "ad" && k.resource.type !== "live" && k.resource.uri)
    .map(({ resource: h }: any) => ({
      id: h.id,
      title: h.title || h.content_short,
      extra: { date: h.display_time * 1000 },
      url: h.uri,
    }))
}

const hot = async (): Promise<NewsItem[]> => {
  const apiUrl = `https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all`
  const res: any = await myFetch(apiUrl)
  return res.data.day_items.map((h: Item) => ({
    id: h.id,
    title: h.title!,
    url: h.uri,
  }))
}

export default {
  "wallstreetcn": live,
  "wallstreetcn-quick": live,
  "wallstreetcn-news": news,
  "wallstreetcn-hot": hot,
} satisfies SourceDef
