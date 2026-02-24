import { myFetch } from "./fetch.js"
import * as cheerio from "cheerio"
import type { NewsItem } from "./types.js"

export async function fetchRSS(url: string): Promise<NewsItem[]> {
  const xml: string = await myFetch(url)
  const $ = cheerio.load(xml, { xmlMode: true })
  const items: NewsItem[] = []

  $("item").each((_, el) => {
    const title = $(el).find("title").text()
    const link = $(el).find("link").text()
    const pubDate = $(el).find("pubDate").text()
    const description = $(el).find("description").text()
    if (title && link) {
      items.push({
        id: link,
        title,
        url: link,
        pubDate: pubDate ? new Date(pubDate).getTime() : undefined,
        extra: {
          hover: description,
        },
      })
    }
  })

  return items
}
