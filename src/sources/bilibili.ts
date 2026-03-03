import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

function formatNumber(num: number): string {
  if (num >= 10000) return `${Math.floor(num / 10000)}w+`
  return num.toString()
}

interface WapRes {
  list: {
    keyword: string
    show_name: string
    icon: string
  }[]
}

interface HotVideoRes {
  code: number
  message?: string
  data: {
    list: {
      bvid: string
      title: string
      pubdate: number
      desc: string
      pic: string
      owner: { name: string }
      stat: { view: number; like: number }
    }[]
  } | null
}

const BILI_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Referer": "https://www.bilibili.com/",
}

function toVideoItems(res?: HotVideoRes): NewsItem[] {
  if (!res || res.code !== 0 || !res.data || !Array.isArray(res.data.list)) {
    return []
  }
  return res.data.list.map(video => ({
    id: video.bvid,
    title: video.title,
    url: `https://www.bilibili.com/video/${video.bvid}`,
    pubDate: video.pubdate * 1000,
    extra: {
      info: `${video.owner.name} · ${formatNumber(video.stat.view)}观看 · ${formatNumber(video.stat.like)}点赞`,
      hover: video.desc,
      icon: video.pic,
    },
  }))
}

const hotSearch = async (): Promise<NewsItem[]> => {
  const url = "https://s.search.bilibili.com/main/hotword?limit=30"
  const res: WapRes = await myFetch(url, { headers: BILI_HEADERS })
  return res.list.map(k => ({
    id: k.keyword,
    title: k.show_name,
    url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(k.keyword)}`,
    extra: { icon: k.icon },
  }))
}

const hotVideo = async (): Promise<NewsItem[]> => {
  const url = "https://api.bilibili.com/x/web-interface/popular"
  const res: HotVideoRes = await myFetch(url, { headers: BILI_HEADERS })
  return toVideoItems(res)
}

const ranking = async (): Promise<NewsItem[]> => {
  const primaryUrls = [
    "https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all",
    "https://api.bilibili.com/x/web-interface/ranking/v2",
  ]

  for (const url of primaryUrls) {
    try {
      const res: HotVideoRes = await myFetch(url, { headers: BILI_HEADERS })
      const items = toVideoItems(res)
      if (items.length) return items
    } catch {
      // Continue to next ranking endpoint.
    }
  }

  // If ranking endpoints are blocked by risk-control, fallback to popular list.
  try {
    return await hotVideo()
  } catch {
    return []
  }
}

export default {
  "bilibili": hotSearch,
  "bilibili-hot-search": hotSearch,
  "bilibili-hot-video": hotVideo,
  "bilibili-ranking": ranking,
} satisfies SourceDef
