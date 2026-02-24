import { myFetch } from "../../fetch.js"
import { md5, encodeBase64 } from "../../crypto.js"
import { load } from "cheerio"
import type { NewsItem, SourceDef } from "../../types.js"

function getRandomDEVICE_ID() {
  const r = [10, 6, 6, 6, 14]
  const id = r.map(i => Math.random().toString(36).substring(2, i))
  return id.join("-")
}

async function get_app_token() {
  const DEVICE_ID = getRandomDEVICE_ID()
  const now = Math.round(Date.now() / 1000)
  const hex_now = `0x${now.toString(16)}`
  const md5_now = await md5(now.toString())
  const s = `token://com.coolapk.market/c67ef5943784d09750dcfbb31020f0ab?${md5_now}$${DEVICE_ID}&com.coolapk.market`
  const md5_s = await md5(encodeBase64(s))
  const token = md5_s + DEVICE_ID + hex_now
  return token
}

async function genHeaders() {
  return {
    "X-Requested-With": "XMLHttpRequest",
    "X-App-Id": "com.coolapk.market",
    "X-App-Token": await get_app_token(),
    "X-Sdk-Int": "29",
    "X-Sdk-Locale": "zh-CN",
    "X-App-Version": "11.0",
    "X-Api-Version": "11",
    "X-App-Code": "2101202",
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; Redmi K30 5G MIUI/V12.0.3.0.QGICMXM) (#Build; Redmi; Redmi K30 5G; QKQ1.191222.002 test-keys; 10) +CoolMarket/11.0-2101202",
  }
}

interface Res {
  data: {
    id: string
    message: string
    editor_title: string
    url: string
    dateline: number
    targetRow: { subTitle: string }
  }[]
}

const handler = async (): Promise<NewsItem[]> => {
  const url = "https://api.coolapk.com/v6/page/dataList?url=%2Ffeed%2FstatList%3FcacheExpires%3D300%26statType%3Dday%26sortField%3Ddetailnum%26title%3D%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&title=%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&subTitle=&page=1"
  const r: Res = await myFetch(url, { headers: await genHeaders() })
  if (!r.data.length) throw new Error("Failed to fetch")
  return r.data.filter(k => k.id).map(i => ({
    id: i.id,
    title: i.editor_title || load(i.message).text().split("\n")[0],
    url: `https://www.coolapk.com${i.url}`,
    extra: { info: i.targetRow?.subTitle },
  }))
}

export default { coolapk: handler } satisfies SourceDef
