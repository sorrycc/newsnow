import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

const express = async (): Promise<NewsItem[]> => {
  const baseURL = "https://www.fastbull.com"
  const html: any = await myFetch(`${baseURL}/cn/express-news`)
  const $ = cheerio.load(html)
  const $main = $(".news-list")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el).find(".title_name")
    const url = a.attr("href")
    const titleText = a.text()
    const title = titleText.match(/【(.+)】/)?.[1] ?? titleText
    const date = $(el).attr("data-date")
    if (url && title && date) {
      news.push({
        url: baseURL + url,
        title: title.length < 4 ? titleText : title,
        id: url,
        pubDate: Number(date),
      })
    }
  })
  return news
}

const newsHandler = async (): Promise<NewsItem[]> => {
  const baseURL = "https://www.fastbull.com"
  const html: any = await myFetch(`${baseURL}/cn/news`)
  const $ = cheerio.load(html)
  const $main = $(".trending_type")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el)
    const url = a.attr("href")
    const title = a.find(".title").text()
    const date = a.find("[data-date]").attr("data-date")
    if (url && title && date) {
      news.push({
        url: baseURL + url,
        title,
        id: url,
        pubDate: Number(date),
      })
    }
  })
  return news
}

export default {
  "fastbull": express,
  "fastbull-express": express,
  "fastbull-news": newsHandler,
} satisfies SourceDef
