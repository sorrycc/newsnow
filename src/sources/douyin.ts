import { myFetch, $fetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  data: {
    word_list: {
      sentence_id: string
      word: string
    }[]
  }
}

async function handler(): Promise<NewsItem[]> {
  const url = "https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1"
  const cookie = (await $fetch.raw("https://login.douyin.com/")).headers.getSetCookie()
  const res: Res = await myFetch(url, {
    headers: { cookie: cookie.join("; ") },
  })
  return res.data.word_list.map((k) => ({
    id: k.sentence_id,
    title: k.word,
    url: `https://www.douyin.com/hot/${k.sentence_id}`,
  }))
}

export default { douyin: handler } satisfies SourceDef
