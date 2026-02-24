import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  topic_list: {
    topics: {
      id: number
      title: string
      visible: boolean
      archived: boolean
      pinned: boolean
      created_at: string
    }[]
  }
}

const hot = async (): Promise<NewsItem[]> => {
  const res = await myFetch<Res>("https://linux.do/top/daily.json")
  return res.topic_list.topics
    .filter(k => k.visible && !k.archived && !k.pinned)
    .map(k => ({
      id: k.id,
      title: k.title,
      url: `https://linux.do/t/topic/${k.id}`,
    }))
}

const latest = async (): Promise<NewsItem[]> => {
  const res = await myFetch<Res>("https://linux.do/latest.json?order=created")
  return res.topic_list.topics
    .filter(k => k.visible && !k.archived && !k.pinned)
    .map(k => ({
      id: k.id,
      title: k.title,
      pubDate: new Date(k.created_at).valueOf(),
      url: `https://linux.do/t/topic/${k.id}`,
    }))
}

export default {
  "linuxdo": latest,
  "linuxdo-latest": latest,
  "linuxdo-hot": hot,
} satisfies SourceDef
