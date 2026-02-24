import { ofetch, type FetchOptions } from "ofetch"

interface MyFetchOptions {
  method?: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: any
  responseType?: "arrayBuffer" | "json" | "text"
}

export async function myFetch<T = any>(url: string, opts?: MyFetchOptions): Promise<T> {
  const fetchOpts: FetchOptions = {}
  if (opts?.method) fetchOpts.method = opts.method as any
  if (opts?.headers) fetchOpts.headers = opts.headers
  if (opts?.query) fetchOpts.query = opts.query
  if (opts?.body) fetchOpts.body = opts.body
  if (opts?.responseType === "arrayBuffer") {
    fetchOpts.responseType = "arrayBuffer"
  } else {
    const contentNegotiation = !opts?.responseType
    if (contentNegotiation) {
      fetchOpts.responseType = "text"
    }
  }

  const res = await ofetch<T>(url, fetchOpts as any)

  if (typeof res === "string") {
    try {
      return JSON.parse(res) as T
    } catch {
      return res as T
    }
  }
  return res as T
}

export const $fetch = Object.assign(ofetch, {
  raw: async (url: string, opts?: any) => {
    return ofetch.raw(url, { redirect: "manual", ...opts })
  },
})
