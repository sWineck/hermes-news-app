import { describe, expect, it } from 'vitest'
import { categorizeArticle, filterArticles, normalizeGdeltArticle } from './types'

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

  it('filters by category and search and sorts newest first', () => {
    const items = [
      { id: '1', title: 'React release', description: 'frontend', source: 'A', url: 'https://a', publishedAt: '2026-07-15T00:00:00Z', category: 'web' as const, tag: 'A' },
      { id: '2', title: 'TypeScript update', description: 'frontend', source: 'B', url: 'https://b', publishedAt: '2026-07-16T00:00:00Z', category: 'web' as const, tag: 'B' },
    ]
    expect(filterArticles(items, 'typescript', 'web')[0].id).toBe('2')
    expect(filterArticles(items, '', 'web')[0].id).toBe('2')
    expect(filterArticles(items, '', 'ai')).toHaveLength(0)
    expect(filterArticles([{ ...items[0], category: 'other' as const }], '', 'other')).toHaveLength(1)
    expect(filterArticles(items, '', 'all')).toHaveLength(2)
  })
})
