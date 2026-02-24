import * as cheerio from "cheerio"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const response: any = await myFetch("https://store.steampowered.com/stats/stats/")
  const $ = cheerio.load(response)
  const $rows = $("#detailStats tr.player_count_row")
  const news: NewsItem[] = []
  $rows.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a.gameLink")
    const url = $a.attr("href")
    const gameName = $a.text().trim()
    const currentPlayers = $el.find("td:first-child .currentServers").text().trim()
    if (url && gameName && currentPlayers) {
      news.push({
        url,
        title: gameName,
        id: url,
        pubDate: Date.now(),
        extra: { info: currentPlayers },
      })
    }
  })
  return news
}

export default { steam: handler } satisfies SourceDef
