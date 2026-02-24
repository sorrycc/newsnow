import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import { parseRelativeDate } from "../utils.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const response: any = await myFetch("https://www.ithome.com/list/")
  const $ = cheerio.load(response)
  const $main = $("#list > div.fl > ul > li")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a.t")
    const url = $a.attr("href")
    const title = $a.text()
    const date = $(el).find("i").text()
    if (url && title && date) {
      const isAd = url?.includes("lapin") || ["神券", "优惠", "补贴", "京东"].find(k => title.includes(k))
      if (!isAd) {
        news.push({
          url,
          title,
          id: url,
          pubDate: parseRelativeDate(date, "Asia/Shanghai").valueOf(),
        })
      }
    }
  })
  return news.sort((m, n) => n.pubDate! > m.pubDate! ? 1 : -1)
}

export default { ithome: handler } satisfies SourceDef
