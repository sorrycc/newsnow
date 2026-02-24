import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  items: {
    url: string
    date_modified?: string
    date_published: string
    title: string
    id: string
  }[]
}

const share = async (): Promise<NewsItem[]> => {
  const res = await Promise.all(
    ["create", "ideas", "programmer", "share"].map(k =>
      myFetch(`https://www.v2ex.com/feed/${k}.json`) as Promise<Res>,
    ),
  )
  return res.map(k => k.items).flat().map(k => ({
    id: k.id,
    title: k.title,
    extra: { date: k.date_modified ?? k.date_published },
    url: k.url,
  })).sort((m, n) => (m.extra.date as string) < (n.extra.date as string) ? 1 : -1)
}

export default {
  "v2ex": share,
  "v2ex-share": share,
} satisfies SourceDef
