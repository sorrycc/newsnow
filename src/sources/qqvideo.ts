import dayjs from "dayjs"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

interface CardParams {
  title: string
  sub_title: string
  publish_date?: string
}

interface WapResp {
  data: {
    card: {
      children_list: {
        list: {
          cards: { id: string; params: CardParams }[]
        }
      }
    }
  }
}

function getQqVideoUrl(cid: string): string {
  return `https://v.qq.com/x/cover/${cid}.html`
}

const hotSearch = async (): Promise<NewsItem[]> => {
  const url = "https://pbaccess.video.qq.com/trpc.vector_layout.page_view.PageService/getCard?video_appid=3000010&vversion_platform=2"
  const resp: WapResp = await myFetch<WapResp>(url, {
    method: "POST",
    headers: { Referer: "https://v.qq.com/" },
    body: {
      page_params: {
        rank_channel_id: "100113",
        rank_name: "HotSearch",
        rank_page_size: "30",
        tab_mvl_sub_mod_id: "792ac_19e77Sub_1b2",
        tab_name: "热搜榜",
        tab_type: "hot_rank",
        tab_vl_data_src: "f5200deb4596bbf3",
        page_id: "scms_shake",
        page_type: "scms_shake",
        source_key: "",
        tag_id: "",
        tag_type: "",
        new_mark_label_enabled: "1",
      },
      page_context: { page_index: "1" },
      flip_info: {
        page_strategy_id: "",
        page_module_id: "792ac_19e77",
        module_strategy_id: {},
        sub_module_id: "20251106065177",
        flip_params: {
          page_id: "scms_shake",
          page_num: "0",
          page_type: "scms_shake",
          source_key: "100113",
        },
        relace_children_key: [],
      },
    },
  })
  return resp?.data?.card?.children_list?.list?.cards?.map((item) => ({
    id: item?.id,
    title: item?.params?.title,
    url: getQqVideoUrl(item?.id),
    pubDate: item?.params?.publish_date ?? dayjs().format("YYYY-MM-DD"),
    extra: { hover: item?.params?.sub_title },
  }))
}

export default { "qqvideo-tv-hotsearch": hotSearch } satisfies SourceDef
