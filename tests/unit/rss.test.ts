import { describe, it, expect } from 'vitest'
import { parseRssItems } from '../../server/utils/rssService'

const feed = (items: string) => `<?xml version="1.0"?><rss><channel><title>Test</title>${items}</channel></rss>`

describe('parseRssItems', () => {
  it('extracts title, link and pubDate from item blocks', () => {
    const xml = feed(`
      <item><title>Plain headline</title><link>https://ex.com/a</link><pubDate>Thu, 18 Sep 2026 08:00:00 GMT</pubDate></item>
      <item><title>Second one</title><link>https://ex.com/b</link></item>
    `)
    const items = parseRssItems(xml)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ title: 'Plain headline', link: 'https://ex.com/a', pubDate: 'Thu, 18 Sep 2026 08:00:00 GMT' })
    expect(items[1]?.pubDate).toBeUndefined()
  })

  it('unwraps CDATA and decodes common entities (the BBC format)', () => {
    const xml = feed(`
      <item><title><![CDATA[Canada welcomes EU proposal to become &amp;#39;associate member&amp;#39;]]></title><link>https://bbc.co.uk/x</link></item>
    `)
    const items = parseRssItems(xml)
    expect(items[0]?.title).toContain('Canada welcomes EU proposal')
  })

  it('skips items without titles and tolerates garbage input', () => {
    const xml = feed('<item><link>https://ex.com/no-title</link></item>')
    expect(parseRssItems(xml)).toHaveLength(0)
    expect(parseRssItems('not xml at all')).toHaveLength(0)
    expect(parseRssItems('')).toHaveLength(0)
  })

  it('ignores the channel title outside item blocks', () => {
    const xml = feed('<item><title>Real item</title><link>https://ex.com/r</link></item>')
    const items = parseRssItems(xml)
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('Real item')
  })
})
