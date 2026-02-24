import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import { parseRelativeDate } from "../utils.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const baseURL = "https://www.gelonghui.com"
  const html: any = await myFetch("https://www.gelonghui.com/news/")
  const $ = cheerio.load(html)
  const $main = $(".article-content")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el).find(".detail-right>a")
    const url = a.attr("href")
    const title = a.find("h2").text()
    const info = $(el).find(".time > span:nth-child(1)").text()
    const relatieveTime = $(el).find(".time > span:nth-child(3)").text()
    if (url && title && relatieveTime) {
      news.push({
        url: baseURL + url,
        title,
        id: url,
        extra: {
          date: parseRelativeDate(relatieveTime, "Asia/Shanghai").valueOf(),
          info,
        },
      })
    }
  })
  return news
}

export default { gelonghui: handler } satisfies SourceDef
