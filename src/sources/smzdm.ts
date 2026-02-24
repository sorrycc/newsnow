import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const baseURL = "https://post.smzdm.com/hot_1/"
  const html: any = await myFetch(baseURL)
  const $ = cheerio.load(html)
  const $main = $("#feed-main-list .z-feed-title")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el).find("a")
    const url = a.attr("href")!
    const title = a.text()
    news.push({ url, title, id: url })
  })
  return news
}

export default { smzdm: handler } satisfies SourceDef
