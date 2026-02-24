import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import { fetchRSS } from "../rss.js"
import type { NewsItem, SourceDef } from "../types.js"

const hot = async (): Promise<NewsItem[]> => {
  const baseUrl = "https://www.chongbuluo.com/"
  const html: string = await myFetch(`${baseUrl}forum.php?mod=guide&view=hot`)
  const $ = cheerio.load(html)
  const news: NewsItem[] = []
  $(".bmw table tr").each((_, elem) => {
    const xst = $(elem).find(".common .xst").text()
    const url = $(elem).find(".common a").attr("href")
    news.push({
      id: baseUrl + url,
      url: baseUrl + url,
      title: xst,
      extra: { hover: xst },
    })
  })
  return news
}

const latest = async (): Promise<NewsItem[]> => {
  return fetchRSS("https://www.chongbuluo.com/forum.php?mod=rss&view=newthread")
}

export default {
  "chongbuluo": hot,
  "chongbuluo-hot": hot,
  "chongbuluo-latest": latest,
} satisfies SourceDef
