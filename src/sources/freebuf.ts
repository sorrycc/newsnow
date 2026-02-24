import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

function formatUrl(url: string | undefined, baseUrl: string = "https://www.freebuf.com"): string {
  if (!url) return ""
  return url.startsWith("http") ? url : `${baseUrl}${url}`
}

function extractIdFromUrl(url: string): string {
  const lastPart = url.slice(url.lastIndexOf("/") + 1)
  const match = lastPart.match(/\d+/)
  return match ? match[0] : ""
}

async function handler(): Promise<NewsItem[]> {
  const baseUrl = "https://www.freebuf.com"
  const html = await myFetch<any>(baseUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Referer": "https://www.freebuf.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    },
  })
  const $ = cheerio.load(html)
  const articles: NewsItem[] = []
  $(".article-item").each((_, articleElement) => {
    const $article = $(articleElement)
    try {
      const titleLink = $article.find(".title-left .title").parent()
      const title = titleLink.find(".title").text().trim()
      const url = formatUrl(titleLink.attr("href"), baseUrl)
      if (!title) return
      const description = $article.find(".item-right .text-line-2").first().text().trim()
      articles.push({
        id: extractIdFromUrl(url),
        title,
        url,
        extra: { hover: description },
      })
    } catch {}
  })
  return articles
}

export default { freebuf: handler } satisfies SourceDef
