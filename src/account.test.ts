import { describe, expect, it } from 'vitest'
import { createAnonymousAccountData } from './account'

describe('account migration boundary', () => {
  it('creates anonymous data without requiring a backend or identity', () => {
    const data = createAnonymousAccountData({ feedIds: ['feed-1'], favoriteArticleIds: ['article-1'], theme: 'dark', search: 'AI', category: 'ai' })
    expect(data.version).toBe(1)
    expect(data.ownerId).toBeUndefined()
    expect(data.preferences.feedIds).toEqual(['feed-1'])
  })
})
