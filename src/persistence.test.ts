import { describe, expect, it } from 'vitest'
import { migrateArticleCollection, migrateFeedCollection, serializeCollection, serializeFeeds, STORAGE_VERSION } from './persistence'

describe('versioned client persistence', () => {
  it('migrates legacy article arrays without losing feed fields', () => {
    const legacy = [{ id: 'a', title: 'Saved', description: 'x', source: 'Feed', url: 'https://example.com/a', publishedAt: '2026-07-16T00:00:00Z', category: 'ai', tag: 'RSS', feedId: 'feed-1' }]
    expect(migrateArticleCollection(legacy)[0].feedId).toBe('feed-1')
  })

  it('serializes a versioned collection for future account sync', () => {
    const article = { id: 'a', title: 'Saved', description: 'x', source: 'Feed', url: 'https://example.com/a', publishedAt: '2026-07-16T00:00:00Z', category: 'ai' as const, tag: 'RSS' }
    const result = JSON.parse(serializeCollection([article]))
    expect(result.version).toBe(STORAGE_VERSION)
    expect(result.items).toHaveLength(1)
  })

  it('migrates and serializes feed configuration with the same version envelope', () => {
    const feed = { id: 'feed-1', name: 'Example', url: 'https://example.com/feed.xml', channel: 'ai' as const, enabled: true, status: 'ready' as const }
    expect(migrateFeedCollection([feed])).toEqual([feed])
    expect(JSON.parse(serializeFeeds([feed]))).toMatchObject({ version: STORAGE_VERSION, items: [feed] })
  })
})
