import { myFetch } from "../fetch.js"
import { parseRelativeDate } from "../utils.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Jin10Item {
  id: string
  time: string
  data: {
    title?: string
    content?: string
  }
  important: number
  channel: number[]
}

async function handler(): Promise<NewsItem[]> {
  const timestamp = Date.now()
  const url = `https://www.jin10.com/flash_newest.js?t=${timestamp}`
  const rawData: string = await myFetch(url)
  const jsonStr = (rawData as string)
    .replace(/^var\s+newest\s*=\s*/, "")
    .replace(/;*$/, "")
    .trim()
  const data: Jin10Item[] = JSON.parse(jsonStr)
  return data.filter(k => (k.data.title || k.data.content) && !k.channel?.includes(5)).map((k) => {
    const text = (k.data.title || k.data.content)!.replace(/<\/?b>/g, "")
    const [, title, desc] = text.match(/^【([^】]*)】(.*)$/) ?? []
    return {
      id: k.id,
      title: title ?? text,
      pubDate: parseRelativeDate(k.time, "Asia/Shanghai").valueOf(),
      url: `https://flash.jin10.com/detail/${k.id}`,
      extra: { hover: desc, info: !!k.important && "✰" },
    }
  })
}

export default { jin10: handler } satisfies SourceDef
