import { type Article, keywordBasedSentiment } from '../../utils/sentiment'

// Keyless news sources (issue: upstream APIs rate-limit or quota out).
// RSS from stable public broadcasters needs no key, no account and has no
// practical quota — the most outage-resistant feed the project can have.
const FEEDS = [
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
]

const FETCH_TIMEOUT_MS = 6000
const MAX_ITEMS_PER_FEED = 15

/**
 * Minimal RSS item extraction — titles, links and publication dates from
 * <item> blocks, tolerating CDATA. Deliberately dependency-free: these are
 * two well-formed, stable feeds, and every failure mode is caught upstream.
 */
export function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate?: string }> {
  const items: Array<{ title: string; link: string; pubDate?: string }> = []
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

  const textOf = (block: string, tag: string): string => {
    const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
    if (!match) return ''
    return match[1]!
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .trim()
  }

  for (const block of itemBlocks) {
    const title = textOf(block, 'title')
    const link = textOf(block, 'link')
    if (!title) continue
    items.push({ title, link, pubDate: textOf(block, 'pubDate') || undefined })
  }
  return items
}

async function fetchFeed(feed: { name: string; url: string }, signal?: AbortSignal): Promise<Article[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const abortListener = () => controller.abort()
  signal?.addEventListener('abort', abortListener, { once: true })

  try {
    const response = await fetch(feed.url, {
      headers: { 'User-Agent': 'EmotionWave/1.0' },
      signal: controller.signal,
    })
    if (!response.ok) return []

    const xml = await response.text()
    return parseRssItems(xml).slice(0, MAX_ITEMS_PER_FEED).map(item => ({
      sentiment: Math.max(-10, Math.min(10, keywordBasedSentiment(item.title))),
      url: item.link,
      title: item.title,
      source: feed.name,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
    }))
  } catch (error) {
    console.warn(`RSS fetch failed for ${feed.name}:`, error)
    return []
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortListener)
  }
}

export async function fetchRssHeadlines(signal?: AbortSignal): Promise<Article[]> {
  const results = await Promise.all(FEEDS.map(feed => fetchFeed(feed, signal)))
  return results.flat()
}
