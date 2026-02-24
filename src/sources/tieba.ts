import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface Res {
  data: {
    bang_topic: {
      topic_list: {
        topic_id: string
        topic_name: string
        topic_url: string
      }[]
    }
  }
}

async function handler(): Promise<NewsItem[]> {
  const url = "https://tieba.baidu.com/hottopic/browse/topicList"
  const res: Res = await myFetch(url)
  return res.data.bang_topic.topic_list.map((k) => ({
    id: k.topic_id,
    title: k.topic_name,
    url: k.topic_url,
  }))
}

export default { tieba: handler } satisfies SourceDef
