import process from "node:process"
import { myFetch } from "../fetch.js"
import type { NewsItem, SourceDef } from "../types.js"

async function handler(): Promise<NewsItem[]> {
  const apiToken = process.env.PRODUCTHUNT_API_TOKEN
  const token = `Bearer ${apiToken}`
  if (!apiToken) throw new Error("PRODUCTHUNT_API_TOKEN is not set")
  const query = `
    query {
      posts(first: 30, order: VOTES) {
        edges {
          node { id name tagline votesCount url slug }
        }
      }
    }
  `
  const response: any = await myFetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      "Authorization": token,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query }),
  })
  const posts = response?.data?.posts?.edges || []
  return posts.map((edge: any) => {
    const post = edge.node
    return {
      id: post.id,
      title: post.name,
      url: post.url || `https://www.producthunt.com/posts/${post.slug}`,
      extra: { info: ` △︎ ${post.votesCount || 0}`, hover: post.tagline },
    }
  }).filter((p: any) => p.id && p.title)
}

export default { producthunt: handler } satisfies SourceDef
