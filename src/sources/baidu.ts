import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  data: {
    cards: {
      content: {
        isTop?: boolean
        word: string
        rawUrl: string
        desc?: string
      }[]
    }[]
  }
}

async function handler(): Promise<NewsItem[]> {
  const rawData: string = await myFetch(`https://top.baidu.com/board?tab=realtime`)
  const jsonStr = (rawData as string).match(/<!--s-data:(.*?)-->/s)
  const data: Res = JSON.parse(jsonStr![1])
  return data.data.cards[0].content.filter(k => !k.isTop).map((k) => ({
    id: k.rawUrl,
    title: k.word,
    url: k.rawUrl,
    extra: { hover: k.desc },
  }))
}

export default { baidu: handler } satisfies SourceDef
