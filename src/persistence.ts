import { Article, FeedSource } from './types'

export const STORAGE_VERSION = 2

type VersionedCollection = { version: number; items: unknown[] }

export function migrateArticleCollection(value: unknown): Article[] {
  const items = Array.isArray(value) ? value : isVersionedCollection(value) ? value.items : []
  return items.filter(isArticle)
}

export function serializeCollection(items: Article[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, items })
}

export function serializeFeeds(items: FeedSource[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, items })
}

export function migrateFeedCollection(value: unknown): FeedSource[] {
  const items = Array.isArray(value) ? value : isVersionedCollection(value) ? value.items : []
  return items.filter(isFeedSource)
}

function isFeedSource(value: unknown): value is FeedSource {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<FeedSource>
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.url === 'string' && /^https?:\/\//i.test(item.url)
}

function isVersionedCollection(value: unknown): value is VersionedCollection {
  return Boolean(value && typeof value === 'object' && 'items' in value && Array.isArray((value as VersionedCollection).items))
}

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Article>
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string' && typeof item.publishedAt === 'string' && typeof item.category === 'string'
}
