import * as cheerio from "cheerio"
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
  }
}

const hotSearch = async (): Promise<NewsItem[]> => {
  const url = "https://s.search.bilibili.com/main/hotword?limit=30"
  const res: WapRes = await myFetch(url)
  return res.list.map(k => ({
    id: k.keyword,
    title: k.show_name,
    url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(k.keyword)}`,
    extra: { icon: k.icon },
  }))
}

const hotVideo = async (): Promise<NewsItem[]> => {
  const url = "https://api.bilibili.com/x/web-interface/popular"
  const res: HotVideoRes = await myFetch(url)
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

const ranking = async (): Promise<NewsItem[]> => {
  const url = "https://api.bilibili.com/x/web-interface/ranking/v2"
  const res: HotVideoRes = await myFetch(url)
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

export default {
  "bilibili": hotSearch,
  "bilibili-hot-search": hotSearch,
  "bilibili-hot-video": hotVideo,
  "bilibili-ranking": ranking,
} satisfies SourceDef
