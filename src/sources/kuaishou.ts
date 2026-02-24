import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const html = await myFetch("https://www.kuaishou.com/?isHome=1")
  const matches = (html as string).match(/window\.__APOLLO_STATE__\s*=\s*(\{.+?\});/)
  if (!matches) throw new Error("无法获取快手热榜数据")
  const data: any = JSON.parse(matches[1])
  const hotRankId = data.defaultClient.ROOT_QUERY[`visionHotRank({"page":"home"})`].id
  const hotRankData = data.defaultClient[hotRankId]
  return hotRankData.items.filter((k: any) => data.defaultClient[k.id].tagType !== "置顶").map((item: any) => {
    const hotSearchWord = item.id.replace("VisionHotRankItem:", "")
    const hotItem = data.defaultClient[item.id]
    return {
      id: hotSearchWord,
      title: hotItem.name,
      url: `https://www.kuaishou.com/search/video?searchKey=${encodeURIComponent(hotItem.name)}`,
      extra: { icon: hotItem.iconUrl },
    }
  })
}

export default { kuaishou: handler } satisfies SourceDef
