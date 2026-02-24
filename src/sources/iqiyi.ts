import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface VideoInfo {
  entity_id: number
  title: string
  page_url: string
  showDate: string
  desc: string
  description: string
  tag: string
}

interface WapResp {
  items: {
    video: {
      data: VideoInfo[]
    }[]
  }[]
}

const hotRankList = async (): Promise<NewsItem[]> => {
  const url =
    "https://mesh.if.iqiyi.com/portal/lw/v7/channel/card/videoTab?channelName=recommend"
    + "&data_source=v7_rec_sec_hot_rank_list&tempId=85&count=30&block_id=hot_ranklist"
    + "&device=14a4b5ba98e790dce6dc07482447cf48&from=webapp"
  const resp = await myFetch<WapResp>(url, {
    headers: { Referer: "https://www.iqiyi.com" },
  })
  return resp?.items[0]?.video[0]?.data.map((item) => ({
    id: item.entity_id,
    title: item.title,
    url: item.page_url,
    pubDate: item?.showDate,
    extra: { info: item.desc, hover: item.description, tag: item.tag },
  }))
}

export default { "iqiyi-hot-ranklist": hotRankList } satisfies SourceDef
