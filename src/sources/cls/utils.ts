import { myFetch } from "../../fetch.js"
import { md5, myCrypto } from "../../crypto.js"

const params = {
  appName: "CailianpressWeb",
  os: "web",
  sv: "7.7.5",
}

export async function getSearchParams(moreParams?: any) {
  const searchParams = new URLSearchParams({ ...params, ...moreParams })
  searchParams.sort()
  searchParams.append("sign", await md5(await myCrypto(searchParams.toString(), "SHA-1")))
  return searchParams
}
