import { Article, CategoryId, categoryMap, normalizeGdeltArticle } from './types'

const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const HN_SEARCH_ENDPOINT = 'https://hn.algolia.com/api/v1/search_by_date'

type HackerNewsHit = {
  objectID?: string
  title?: string
  url?: string
  story_url?: string
  author?: string
  created_at?: string
  story_text?: string
}

function normalizeHackerNewsHit(raw: HackerNewsHit, category: CategoryId): Article | null {
  const url = raw.url || raw.story_url
  const title = raw.title?.trim()
  if (!url || !title || !/^https?:\/\//i.test(url)) return null
  return {
    id: `hn-${raw.objectID || url}`,
    title,
    description: raw.story_text?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || `Diskussion und Link aus dem Hacker-News-Feed von ${raw.author || 'der Community'}.`,
    source: 'Hacker News',
    url,
    publishedAt: raw.created_at || new Date().toISOString(),
    category,
    tag: 'Hacker News',
  }
}

async function fetchGdelt(category: CategoryId, signal?: AbortSignal): Promise<Article[]> {
  const query = categoryMap[category]?.query || 'technology OR science OR world'
  const params = new URLSearchParams({ query, mode: 'artlist', format: 'json', maxrecords: '48', sort: 'HybridRel', timespan: '7d' })
  const response = await fetch(`${GDELT_ENDPOINT}?${params.toString()}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`GDELT antwortete mit HTTP ${response.status}.`)
  const payload = await response.json() as { articles?: Record<string, unknown>[] }
  const articles = (payload.articles ?? []).map(normalizeGdeltArticle).filter((article): article is Article => Boolean(article))
  if (!articles.length) throw new Error('GDELT lieferte keine verwertbaren Artikel.')
  return Array.from(new Map(articles.map((article) => [article.id, article])).values())
}

async function fetchHackerNews(category: CategoryId, signal?: AbortSignal): Promise<Article[]> {
  const query = categoryMap[category]?.query || 'technology'
  const params = new URLSearchParams({ query, tags: 'story', hitsPerPage: '48' })
  const response = await fetch(`${HN_SEARCH_ENDPOINT}?${params.toString()}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Hacker News antwortete mit HTTP ${response.status}.`)
  const payload = await response.json() as { hits?: HackerNewsHit[] }
  const articles = (payload.hits ?? []).map((hit) => normalizeHackerNewsHit(hit, category)).filter((article): article is Article => Boolean(article))
  if (!articles.length) throw new Error('Hacker News lieferte keine passenden Artikel.')
  return Array.from(new Map(articles.map((article) => [article.id, article])).values())
}

function providerSignal(external?: AbortSignal, milliseconds = 4000): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), milliseconds)
  const onAbort = () => controller.abort()
  external?.addEventListener('abort', onAbort, { once: true })
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onAbort)
    },
  }
}

export async function fetchNews(category: CategoryId, signal?: AbortSignal): Promise<Article[]> {
  const primary = providerSignal(signal)
  try {
    return await fetchGdelt(category, primary.signal)
  } catch (primaryError) {
    primary.cleanup()
    if (signal?.aborted) throw primaryError
    const fallback = providerSignal(signal)
    try {
      return await fetchHackerNews(category, fallback.signal)
    } catch (fallbackError) {
      if (signal?.aborted) throw fallbackError
      throw new Error(`Live-Quellen nicht erreichbar. GDELT: ${String(primaryError)} Fallback Hacker News: ${String(fallbackError)}`)
    } finally {
      fallback.cleanup()
    }
  } finally {
    primary.cleanup()
  }
}
