import { Article, CategoryId, FeedSource, categoryMap, categorizeArticle, mergeArticles, normalizeGdeltArticle } from './types'

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

export type FeedFetchResult = {
  feed: FeedSource
  articles: Article[]
}

function stripMarkup(value: string): string {
  const text = value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
  const element = typeof document !== 'undefined' ? document.createElement('textarea') : null
  if (element) { element.innerHTML = text; return element.value.replace(/\s+/g, ' ').trim() }
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeHackerNewsHit(raw: HackerNewsHit, category: Exclude<CategoryId, 'all'>): Article | null {
  const url = raw.url || raw.story_url
  const title = raw.title?.trim()
  if (!url || !title || !/^https?:\/\//i.test(url)) return null
  return {
    id: `hn-${raw.objectID || url}`,
    title,
    description: stripMarkup(raw.story_text || '') || `Diskussion und Link aus dem Hacker-News-Feed von ${raw.author || 'der Community'}.`,
    source: 'Hacker News',
    url,
    publishedAt: raw.created_at || new Date().toISOString(),
    retrievedAt: new Date().toISOString(),
    category,
    tag: 'Hacker News',
    imageAlt: title,
  }
}

async function fetchGdelt(category: Exclude<CategoryId, 'all'>, signal?: AbortSignal): Promise<Article[]> {
  const query = categoryMap[category]?.query || 'technology OR science OR world'
  const params = new URLSearchParams({ query, mode: 'artlist', format: 'json', maxrecords: '48', sort: 'HybridRel', timespan: '7d' })
  const response = await fetch(`${GDELT_ENDPOINT}?${params.toString()}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`GDELT antwortete mit HTTP ${response.status}.`)
  const payload = await response.json() as { articles?: Record<string, unknown>[] }
  const articles = (payload.articles ?? []).map(normalizeGdeltArticle).filter((article): article is Article => Boolean(article))
  if (!articles.length) throw new Error('GDELT lieferte keine verwertbaren Artikel.')
  return mergeArticles([], articles)
}

async function fetchHackerNews(category: Exclude<CategoryId, 'all'>, signal?: AbortSignal): Promise<Article[]> {
  const query = categoryMap[category]?.query || 'technology'
  const params = new URLSearchParams({ query, tags: 'story', hitsPerPage: '48' })
  const response = await fetch(`${HN_SEARCH_ENDPOINT}?${params.toString()}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Hacker News antwortete mit HTTP ${response.status}.`)
  const payload = await response.json() as { hits?: HackerNewsHit[] }
  const articles = (payload.hits ?? []).map((hit) => normalizeHackerNewsHit(hit, category)).filter((article): article is Article => Boolean(article))
  if (!articles.length) throw new Error('Hacker News lieferte keine passenden Artikel.')
  return mergeArticles([], articles)
}

function providerSignal(external?: AbortSignal, milliseconds = 4000): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), milliseconds)
  const onAbort = () => controller.abort()
  external?.addEventListener('abort', onAbort, { once: true })
  return { signal: controller.signal, cleanup: () => { clearTimeout(timer); external?.removeEventListener('abort', onAbort) } }
}

function assertSafeFeedUrl(value: string): URL {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Nur HTTP- und HTTPS-Feeds sind erlaubt.')
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.') || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.endsWith('.local')) throw new Error('Lokale oder interne Feed-Ziele sind nicht erlaubt.')
  return url
}

function xmlValue(node: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const found = node.querySelector(selector)
    if (found?.textContent?.trim()) return found.textContent.trim()
  }
  return ''
}

function xmlLink(node: Element): string {
  const link = node.querySelector('link')
  return link?.getAttribute('href') || link?.textContent?.trim() || ''
}

export function extractImageUrl(value: { url?: string | null; href?: string | null }): string | undefined {
  const candidate = value.url || value.href || ''
  return /^https?:\/\//i.test(candidate) ? candidate : undefined
}

function xmlImageUrl(node: Element): string | undefined {
  const mediaNamespace = 'http://search.yahoo.com/mrss/'
  const media = node.querySelector('enclosure')
    || node.getElementsByTagNameNS(mediaNamespace, 'content')[0]
    || node.getElementsByTagNameNS(mediaNamespace, 'thumbnail')[0]
  const attribute = extractImageUrl({ url: media?.getAttribute('url'), href: media?.getAttribute('href') })
  if (attribute) return attribute
  const image = node.querySelector('image, thumbnail')?.textContent?.trim()
  return extractImageUrl({ url: image })
}
export function parseRssXml(xml: string, feed: FeedSource): Article[] {
  if (typeof DOMParser === 'undefined') throw new Error('RSS-Parsing ist in dieser Umgebung nicht verfügbar.')
  const documentXml = new DOMParser().parseFromString(xml, 'text/xml')
  if (documentXml.querySelector('parsererror')) throw new Error('Der Feed enthält kein gültiges XML.')
  const nodes = Array.from(documentXml.querySelectorAll('item, entry'))
  const articles = nodes.map((node): Article | null => {
    const title = stripMarkup(xmlValue(node, ['title']))
    const url = xmlLink(node)
    if (!title || !/^https?:\/\//i.test(url)) return null
    const description = stripMarkup(xmlValue(node, ['description', 'summary', 'content'])) || 'Artikel aus einem konfigurierten RSS-/Atom-Feed.'
    const publishedAt = xmlValue(node, ['pubDate', 'published', 'updated', 'dc\\:date']) || new Date().toISOString()
    return {
      id: `rss-${feed.id}-${xmlValue(node, ['guid', 'id']) || url}`,
      title,
      description,
      source: feed.name,
      url,
      publishedAt: Number.isNaN(Date.parse(publishedAt)) ? new Date().toISOString() : new Date(publishedAt).toISOString(),
      retrievedAt: new Date().toISOString(),
      category: feed.channel || categorizeArticle(title, description),
      tag: 'RSS',
      feedId: feed.id,
      imageUrl: xmlImageUrl(node),
      imageAlt: title,
    }
  }).filter((article): article is Article => Boolean(article))
  if (!articles.length) throw new Error('Der Feed enthält keine verwertbaren Artikel.')
  return mergeArticles([], articles)
}

export async function testFeed(feed: FeedSource, signal?: AbortSignal): Promise<FeedFetchResult> {
  const url = assertSafeFeedUrl(feed.url)
  const response = await fetch(url, { signal, headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } })
  if (!response.ok) throw new Error(`${feed.name} antwortete mit HTTP ${response.status}.`)
  const text = await response.text()
  const articles = parseRssXml(text, feed)
  return { feed: { ...feed, status: 'ready', error: undefined, lastSuccessAt: new Date().toISOString() }, articles }
}

export async function fetchConfiguredFeeds(feeds: FeedSource[], signal?: AbortSignal): Promise<FeedFetchResult[]> {
  const active = feeds.filter((feed) => feed.enabled)
  const results = await Promise.all(active.map(async (feed) => {
    try { return await testFeed(feed, signal) }
    catch (cause) { return { feed: { ...feed, status: 'error' as const, error: cause instanceof Error ? cause.message : 'Feed konnte nicht geladen werden.', lastTestedAt: new Date().toISOString() }, articles: [] } }
  }))
  return results
}

export async function fetchNews(category: Exclude<CategoryId, 'all'>, signal?: AbortSignal, feeds: FeedSource[] = []): Promise<{ articles: Article[]; feedResults: FeedFetchResult[]; provider: 'gdelt' | 'hacker-news' | 'mixed' }> {
  let primaryArticles: Article[]
  let provider: 'gdelt' | 'hacker-news' | 'mixed' = 'gdelt'
  const primary = providerSignal(signal)
  try { primaryArticles = await fetchGdelt(category, primary.signal) }
  catch (primaryError) {
    if (signal?.aborted) throw primaryError
    const fallback = providerSignal(signal)
    try { primaryArticles = await fetchHackerNews(category, fallback.signal); provider = 'hacker-news' }
    catch (fallbackError) {
      if (signal?.aborted) throw fallbackError
      throw new Error(`Live-Quellen nicht erreichbar. GDELT: ${String(primaryError)} Fallback Hacker News: ${String(fallbackError)}`)
    } finally { fallback.cleanup() }
  } finally { primary.cleanup() }
  const feedResults = await fetchConfiguredFeeds(feeds, signal)
  const feedArticles = feedResults.flatMap((result) => result.articles)
  return { articles: mergeArticles(primaryArticles, feedArticles), feedResults, provider: feedArticles.length ? 'mixed' : provider }
}
