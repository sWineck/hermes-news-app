import { Article } from './types'

export const STORAGE_VERSION = 2

type VersionedCollection = { version: number; items: Article[] }

export function migrateArticleCollection(value: unknown): Article[] {
  const items = Array.isArray(value) ? value : isVersionedCollection(value) ? value.items : []
  return items.filter(isArticle)
}

export function serializeCollection(items: Article[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, items })
}

function isVersionedCollection(value: unknown): value is VersionedCollection {
  return Boolean(value && typeof value === 'object' && 'items' in value && Array.isArray((value as VersionedCollection).items))
}

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Article>
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string' && typeof item.publishedAt === 'string' && typeof item.category === 'string'
}
