import { myFetch } from "../fetch.js"
import * as cheerio from "cheerio"
import type { NewsItem, SourceDef } from "../types.js"

function parseDiscourseRSS(xml: string): NewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const items: NewsItem[] = []
  $("item").each((_, el) => {
    const pinned = $(el).find("discourse\\:topicPinned").text()
    const archived = $(el).find("discourse\\:topicArchived").text()
    if (pinned === "Yes" || archived === "Yes") return
    const title = $(el).find("title").text()
    const link = $(el).find("link").text()
    const pubDate = $(el).find("pubDate").text()
    if (title && link) {
      items.push({
        id: link,
        title,
        url: link,
        pubDate: pubDate ? new Date(pubDate).getTime() : undefined,
      })
    }
  })
  return items
}

const hot = async (): Promise<NewsItem[]> => {
  const xml: string = await myFetch("https://linux.do/top/daily.rss")
  return parseDiscourseRSS(xml)
}

const latest = async (): Promise<NewsItem[]> => {
  const xml: string = await myFetch("https://linux.do/latest.rss")
  return parseDiscourseRSS(xml)
}

export default {
  "linuxdo": latest,
  "linuxdo-latest": latest,
  "linuxdo-hot": hot,
} satisfies SourceDef
