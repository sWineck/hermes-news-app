// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseRssXml } from './api'

const feed = { id: 'tagesschau', name: 'Tagesschau', url: 'https://www.tagesschau.de/inland/regional/berlin/index~rss2.xml', channel: 'other' as const, enabled: true, status: 'untested' as const }

describe('RSS media namespaces', () => {
  it('parses media:content without throwing an invalid-selector error', () => {
    const xml = '<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title>Berlin</title><link>https://example.com/berlin</link><description>News</description><media:content url="https://cdn.example.com/berlin.jpg" type="image/jpeg" /></item></channel></rss>'
    const articles = parseRssXml(xml, feed)
    expect(articles).toHaveLength(1)
    expect(articles[0].imageUrl).toBe('https://cdn.example.com/berlin.jpg')
  })
})
