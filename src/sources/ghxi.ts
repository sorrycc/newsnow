import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

function relativeTimeToDate(timeStr: string) {
  const units: Record<string, number> = {
    "秒": 1000,
    "分钟": 60 * 1000,
    "小时": 60 * 60 * 1000,
    "天": 24 * 60 * 60 * 1000,
    "周": 7 * 24 * 60 * 60 * 1000,
    "月": 30 * 24 * 60 * 60 * 1000,
    "年": 365 * 24 * 60 * 60 * 1000,
  }
  const match = timeStr.match(/^(\d+)\s*([秒天周月年]|分钟|小时)/)
  if (!match) return ""
  const num = parseInt(match[1])
  const unit = match[2] as keyof typeof units
  const msAgo = num * units[unit]
  return new Date(Date.now() - msAgo).valueOf()
}

async function handler(): Promise<NewsItem[]> {
  const html: any = await myFetch("https://www.ghxi.com/category/all")
  const $ = cheerio.load(html)
  const news: NewsItem[] = []
  $(".sec-panel .sec-panel-body .post-loop li").each((_, elem) => {
    let summary_title = $(elem).find(".item-content .item-title").text()
    if (summary_title) summary_title = summary_title.trim().replaceAll("'", "''")
    let summary_description = $(elem).find(".item-content .item-excerpt").text()
    if (summary_description) summary_description = summary_description.trim().replaceAll("'", "''")
    const date = $(elem).find(".item-content .date").text()
    const url = $(elem).find(".item-content .item-title a").attr("href")
    if (url) {
      news.push({
        id: url,
        url,
        title: summary_title,
        extra: {
          hover: summary_description,
          date: relativeTimeToDate(date),
        },
      })
    }
  })
  return news
}

export default { ghxi: handler } satisfies SourceDef
