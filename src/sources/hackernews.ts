import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const baseURL = "https://news.ycombinator.com"
  const html: any = await myFetch(baseURL)
  const $ = cheerio.load(html)
  const $main = $(".athing")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el).find(".titleline a").first()
    const title = a.text()
    const id = $(el).attr("id")
    const score = $(`#score_${id}`).text()
    const url = `${baseURL}/item?id=${id}`
    if (url && id && title) {
      news.push({ url, title, id, extra: { info: score } })
    }
  })
  return news
}

export default { hackernews: handler } satisfies SourceDef
