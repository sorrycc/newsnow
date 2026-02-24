import { myFetch } from "../../fetch.js"
import type { NewsItem, SourceDef } from "../../types.js"
import { getSearchParams } from "./utils.js"

interface Item {
  id: number
  title?: string
  brief: string
  shareurl: string
  ctime: number
  is_ad: number
}

const depth = async (): Promise<NewsItem[]> => {
  const apiUrl = `https://www.cls.cn/v3/depth/home/assembled/1000`
  const res: any = await myFetch(apiUrl, {
    query: Object.fromEntries(await getSearchParams()),
  })
  return res.data.depth_list.sort((m: Item, n: Item) => n.ctime - m.ctime).map((k: Item) => ({
    id: k.id,
    title: k.title || k.brief,
    mobileUrl: k.shareurl,
    pubDate: k.ctime * 1000,
    url: `https://www.cls.cn/detail/${k.id}`,
  }))
}

const hot = async (): Promise<NewsItem[]> => {
  const apiUrl = `https://www.cls.cn/v2/article/hot/list`
  const res: any = await myFetch(apiUrl, {
    query: Object.fromEntries(await getSearchParams()),
  })
  return res.data.map((k: Item) => ({
    id: k.id,
    title: k.title || k.brief,
    mobileUrl: k.shareurl,
    url: `https://www.cls.cn/detail/${k.id}`,
  }))
}

const telegraph = async (): Promise<NewsItem[]> => {
  const apiUrl = `https://www.cls.cn/nodeapi/updateTelegraphList`
  const res: any = await myFetch(apiUrl, {
    query: Object.fromEntries(await getSearchParams()),
  })
  return res.data.roll_data.filter((k: Item) => !k.is_ad).map((k: Item) => ({
    id: k.id,
    title: k.title || k.brief,
    mobileUrl: k.shareurl,
    pubDate: k.ctime * 1000,
    url: `https://www.cls.cn/detail/${k.id}`,
  }))
}

export default {
  "cls": telegraph,
  "cls-telegraph": telegraph,
  "cls-depth": depth,
  "cls-hot": hot,
} satisfies SourceDef
