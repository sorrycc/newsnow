import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Report {
  id: string
  time: string
  important: number
  data: { content: string; title: string }
}

interface Res {
  data: Report[]
}

const flash = async (): Promise<NewsItem[]> => {
  const res: Res = await myFetch("https://api.mktnews.net/api/flash?type=0&limit=50")
  return res.data
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .map(item => ({
      id: item.id,
      title: item.data.title || item.data.content.match(/^【([^】]*)】(.*)$/)?.[1] || item.data.content,
      pubDate: item.time,
      extra: {
        info: item.important === 1 ? "Important" : undefined,
        hover: item.data.content,
      },
      url: `https://mktnews.net/flashDetail.html?id=${item.id}`,
    }))
}

export default {
  "mktnews": flash,
  "mktnews-flash": flash,
} satisfies SourceDef
