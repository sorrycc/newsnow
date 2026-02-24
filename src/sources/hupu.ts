import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const html = await myFetch(`https://bbs.hupu.com/topic-daily-hot`)
  const regex = /<li class="bbs-sl-web-post-body">[\s\S]*?<a href="(\/[^"]+?\.html)"[^>]*?class="p-title"[^>]*>([^<]+)<\/a>/g
  const result: NewsItem[] = []
  let match
  while (true) {
    match = regex.exec(html as string)
    if (!match) break
    const [, path, title] = match
    const url = `https://bbs.hupu.com${path}`
    result.push({ id: path, title: title.trim(), url, mobileUrl: url })
  }
  return result
}

export default { hupu: handler } satisfies SourceDef
