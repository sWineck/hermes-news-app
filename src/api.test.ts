// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { parseRssJson, parseRssXml, testFeed } from './api'

const feed = { id: 'tagesschau', name: 'Tagesschau', url: 'https://www.tagesschau.de/inland/regional/berlin/index~rss2.xml', channel: 'other' as const, enabled: true, status: 'untested' as const }

describe('RSS media namespaces', () => {
  it('parses media:content without throwing an invalid-selector error', () => {
    const xml = '<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title>Berlin</title><link>https://example.com/berlin</link><description>News</description><media:content url="https://cdn.example.com/berlin.jpg" type="image/jpeg" /></item></channel></rss>'
    const articles = parseRssXml(xml, feed)
    expect(articles).toHaveLength(1)
    expect(articles[0].imageUrl).toBe('https://cdn.example.com/berlin.jpg')
  })
})

describe('RSS browser transport fallback', () => {
  it('uses RSS2JSON after a browser CORS failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok', items: [{ title: 'Berlin', link: 'https://example.com/berlin', pubDate: '2026-07-17T00:00:00Z', description: 'News' }] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const result = await testFeed(feed)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.articles[0].title).toBe('Berlin')
    expect(parseRssJson({ status: 'ok', items: [{ title: 'JSON', link: 'https://example.com/json' }] }, feed)).toHaveLength(1)
    fetchMock.mockRestore()
  })
})
