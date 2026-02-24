export interface NewsItem {
  id: string | number
  title: string
  url?: string
  mobileUrl?: string
  pubDate?: string | number
  extra?: {
    info?: string | boolean
    hover?: string
    icon?: string | { url: string; scale: number }
    date?: string | number
    [key: string]: any
  }
}

export type SourceHandler = () => Promise<NewsItem[]>
export type SourceDef = Record<string, SourceHandler>
