import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface HotMoviesRes {
  items: {
    id: string
    title: string
    card_subtitle: string
  }[]
}

async function handler(): Promise<NewsItem[]> {
  const baseURL = "https://m.douban.com/rexxar/api/v2/subject/recent_hot/movie"
  const res: HotMoviesRes = await myFetch(baseURL, {
    headers: {
      Referer: "https://movie.douban.com/",
      Accept: "application/json, text/plain, */*",
    },
  })
  return res.items.map(movie => ({
    id: movie.id,
    title: movie.title,
    url: `https://movie.douban.com/subject/${movie.id}`,
    extra: {
      info: movie.card_subtitle.split(" / ").slice(0, 3).join(" / "),
      hover: movie.card_subtitle,
    },
  }))
}

export default { douban: handler } satisfies SourceDef
