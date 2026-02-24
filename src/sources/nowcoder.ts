import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  data: {
    result: {
      id: string
      title: string
      type: number
      uuid: string
    }[]
  }
}

async function handler(): Promise<NewsItem[]> {
  const timestamp = Date.now()
  const url = `https://gw-c.nowcoder.com/api/sparta/hot-search/top-hot-pc?size=20&_=${timestamp}&t=`
  const res: Res = await myFetch(url)
  return res.data.result.map((k) => {
    let itemUrl, id
    if (k.type === 74) {
      itemUrl = `https://www.nowcoder.com/feed/main/detail/${k.uuid}`
      id = k.uuid
    } else if (k.type === 0) {
      itemUrl = `https://www.nowcoder.com/discuss/${k.id}`
      id = k.id
    }
    return { id: id!, title: k.title, url: itemUrl }
  })
}

export default { nowcoder: handler } satisfies SourceDef
