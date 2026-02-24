import { load } from "cheerio"
import dayjs from "dayjs"
import { myFetch } from "../fetch.js"
import { parseRelativeDate } from "../utils.js"
import type { NewsItem, SourceDef } from "../types.js"

const quick = async (): Promise<NewsItem[]> => {
  const baseURL = "https://www.36kr.com"
  const url = `${baseURL}/newsflashes`
  const response = await myFetch(url) as any
  const $ = load(response)
  const news: NewsItem[] = []
  const $items = $(".newsflash-item")
  $items.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a.item-title")
    const url = $a.attr("href")
    const title = $a.text()
    const relativeDate = $el.find(".time").text()
    if (url && title && relativeDate) {
      news.push({
        url: `${baseURL}${url}`,
        title,
        id: url,
        extra: { date: parseRelativeDate(relativeDate, "Asia/Shanghai").valueOf() },
      })
    }
  })
  return news
}

const renqi = async (): Promise<NewsItem[]> => {
  const baseURL = "https://36kr.com"
  const formatted = dayjs().format("YYYY-MM-DD")
  const url = `${baseURL}/hot-list/renqi/${formatted}/1`
  const response = await myFetch<any>(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Referer": "https://www.freebuf.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    },
  })
  const $ = load(response)
  const articles: NewsItem[] = []
  const $items = $(".article-item-info")
  $items.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a.article-item-title.weight-bold")
    const href = $a.attr("href") || ""
    const title = $a.text().trim()
    const description = $el.find("a.article-item-description.ellipsis-2").text().trim()
    const author = $el.find(".kr-flow-bar-author").text().trim()
    const hotText = $el.find(".kr-flow-bar-hot span").text().trim()
    if (href && title) {
      articles.push({
        url: href.startsWith("http") ? href : `${baseURL}${href}`,
        title,
        id: href.slice(3),
        extra: { info: `${author}  |  ${hotText}`, hover: description },
      })
    }
  })
  return articles
}

export default {
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": renqi,
} satisfies SourceDef
