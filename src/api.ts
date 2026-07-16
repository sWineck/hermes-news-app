import { Article, CategoryId, categoryMap, normalizeGdeltArticle } from './types'

const ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'

export async function fetchNews(category: CategoryId, signal?: AbortSignal): Promise<Article[]> {
  const query = categoryMap[category]?.query || 'technology OR science OR world'
  const params = new URLSearchParams({ query, mode: 'artlist', format: 'json', maxrecords: '48', sort: 'HybridRel', timespan: '7d' })
  const response = await fetch(`${ENDPOINT}?${params.toString()}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Die Newsquelle antwortete mit HTTP ${response.status}.`)
  const payload = await response.json() as { articles?: Record<string, unknown>[] }
  const articles = (payload.articles ?? []).map(normalizeGdeltArticle).filter((article): article is Article => Boolean(article))
  if (!articles.length) throw new Error('Die Quelle lieferte für diese Kategorie keine verwertbaren Artikel.')
  return Array.from(new Map(articles.map((article) => [article.id, article])).values())
}
