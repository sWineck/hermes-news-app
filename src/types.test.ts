import { describe, expect, it } from 'vitest'
import { extractImageUrl } from './api'
import { categorizeArticle, filterArticles, filterArticlesAdvanced, mergeArticles, normalizeGdeltArticle } from './types'

describe('news data helpers', () => {
  it('categorizes known interest signals', () => {
    expect(categorizeArticle('New MCP tools for autonomous AI agents')).toBe('ai')
    expect(categorizeArticle('Critical CVE affects OAuth libraries')).toBe('security')
    expect(categorizeArticle('A quiet story about local libraries')).toBe('other')
  })

  it('normalizes valid GDELT article records and rejects incomplete data', () => {
    const article = normalizeGdeltArticle({ title: 'A headline', url: 'https://example.com/story', domain: 'example.com', seendate: '20260716T120000Z' })
    expect(article?.source).toBe('example.com')
    expect(article?.publishedAt).toBe('2026-07-16T12:00:00.000Z')
    expect(normalizeGdeltArticle({ title: '', url: 'nope' })).toBeNull()
  })

  it('extracts RSS image metadata without accepting invalid image URLs', () => {
    expect(extractImageUrl({ url: 'https://cdn.example.com/story.jpg' })).toBe('https://cdn.example.com/story.jpg')
    expect(extractImageUrl({ url: 'javascript:alert(1)' })).toBeUndefined()
  })

  it('supports advanced filtering and deduplicates incoming pool items', () => {
    const items = [
      { id: 'same', title: 'AI agent release', description: 'fresh', source: 'A', url: 'https://a', publishedAt: '2026-07-16T00:00:00Z', category: 'ai' as const, tag: 'A', retrievedAt: '2026-07-16T00:01:00Z' },
      { id: 'old', title: 'Security archive', description: 'old', source: 'B', url: 'https://b', publishedAt: '2026-07-10T00:00:00Z', category: 'security' as const, tag: 'B', retrievedAt: '2026-07-10T00:01:00Z' },
    ]
    expect(filterArticlesAdvanced(items, { search: 'agent', categories: ['ai'], sources: [], days: 30, sort: 'newest' })).toHaveLength(1)
    expect(filterArticlesAdvanced(items, { search: '', categories: [], sources: ['B'], days: 30, sort: 'newest' })[0].id).toBe('old')
    expect(mergeArticles([items[0]], [{ ...items[0], title: 'updated title' }, items[1]])).toHaveLength(2)
    expect(mergeArticles([items[0]], [{ ...items[0], title: 'updated title' }])[0].title).toBe('updated title')
  })
})
