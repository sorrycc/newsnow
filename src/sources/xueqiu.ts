import { myFetch, $fetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface StockRes {
  data: {
    items: {
      code: string
      name: string
      percent: number
      exchange: string
      ad: number
    }[]
  }
}

const hotstock = async (): Promise<NewsItem[]> => {
  const cookie = (await $fetch.raw("https://xueqiu.com/hq")).headers.getSetCookie()
  const url = "https://stock.xueqiu.com/v5/stock/hot_stock/list.json?size=30&_type=10&type=10"
  const res: StockRes = await myFetch(url, {
    headers: { cookie: cookie.join("; ") },
  })
  return res.data.items.filter(k => !k.ad).map(k => ({
    id: k.code,
    url: `https://xueqiu.com/s/${k.code}`,
    title: k.name,
    extra: { info: `${k.percent}% ${k.exchange}` },
  }))
}

export default {
  "xueqiu": hotstock,
  "xueqiu-hotstock": hotstock,
} satisfies SourceDef
