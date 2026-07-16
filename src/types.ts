export type CategoryId = 'all' | 'ai' | 'web' | 'infra' | 'security' | 'design' | 'productivity' | 'other'

export type Category = {
  id: Exclude<CategoryId, 'all'>
  label: string
  eyebrow: string
  query: string
  accent: string
}

export type Article = {
  id: string
  title: string
  description: string
  source: string
  url: string
  imageUrl?: string
  imageAlt?: string
  publishedAt: string
  retrievedAt?: string
  category: Exclude<CategoryId, 'all'>
  tag: string
  language?: string
  feedId?: string
}

export type FilterOptions = {
  search: string
  categories: Exclude<CategoryId, 'all'>[]
  sources: string[]
  days: number
  sort: 'newest' | 'oldest' | 'source'
}

export type FeedSource = {
  id: string
  name: string
  url: string
  channel: Exclude<CategoryId, 'all'>
  enabled: boolean
  lastTestedAt?: string
  lastSuccessAt?: string
  status: 'untested' | 'ready' | 'error'
  error?: string
}

export const categories: Category[] = [
  { id: 'ai', label: 'KI & Agenten', eyebrow: '01 / Intelligence', query: 'AI agents OR LLM OR MCP', accent: '#166534' },
  { id: 'web', label: 'Web & Frontend', eyebrow: '02 / Interface', query: 'React OR TypeScript OR frontend', accent: '#0f766e' },
  { id: 'infra', label: 'Self-hosting', eyebrow: '03 / Systems', query: 'Docker OR self-hosting OR Kubernetes', accent: '#a16207' },
  { id: 'security', label: 'Security & Privacy', eyebrow: '04 / Trust', query: 'cybersecurity OR CVE OR OAuth', accent: '#be123c' },
  { id: 'design', label: 'Design & UX', eyebrow: '05 / Craft', query: 'design systems OR WCAG OR UX', accent: '#6d28d9' },
  { id: 'productivity', label: 'Automation', eyebrow: '06 / Momentum', query: 'automation OR SaaS OR APIs', accent: '#047857' },
  { id: 'other', label: 'Weitere', eyebrow: '07 / Elsewhere', query: '', accent: '#475569' },
]

export const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category])) as Record<Exclude<CategoryId, 'all'>, Category>

export function categorizeArticle(title: string, description = ''): Exclude<CategoryId, 'all'> {
  const haystack = `${title} ${description}`.toLowerCase()
  const ordered: Exclude<CategoryId, 'all'>[] = ['ai', 'security', 'infra', 'web', 'design', 'productivity']
  for (const id of ordered) {
    const terms = categoryMap[id].query.toLowerCase().split(' or ')
    if (terms.some((term) => haystack.includes(term))) return id
  }
  return 'other'
}

export function normalizeGdeltArticle(raw: Record<string, unknown>): Article | null {
  const url = typeof raw.url === 'string' ? raw.url : ''
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!url || !title || !/^https?:\/\//i.test(url)) return null
  const description = typeof raw.seendate === 'string' ? `Im GDELT-Monitor seit ${raw.seendate}.` : 'Aktuelle Meldung aus dem globalen News-Monitor.'
  const source = typeof raw.domain === 'string' ? raw.domain : 'GDELT Monitor'
  const publishedAt = typeof raw.seendate === 'string' ? parseGdeltDate(raw.seendate) : new Date().toISOString()
  return {
    id: url,
    title,
    description,
    source,
    url,
    imageUrl: typeof raw.socialimage === 'string' && raw.socialimage.startsWith('http') ? raw.socialimage : undefined,
    imageAlt: title,
    publishedAt,
    retrievedAt: new Date().toISOString(),
    category: categorizeArticle(title, description),
    tag: source,
  }
}

function parseGdeltDate(value: string): string {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/)
  if (!match) return new Date(value).toISOString()
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString()
}

export function filterArticles(articles: Article[], search: string, category: CategoryId, sort: 'newest' | 'oldest' = 'newest'): Article[] {
  return filterArticlesAdvanced(articles, { search, categories: category === 'all' ? [] : [category], sources: [], days: 0, sort })
}

export function filterArticlesAdvanced(articles: Article[], options: FilterOptions): Article[] {
  const term = options.search.trim().toLowerCase()
  const cutoff = options.days > 0 ? Date.now() - options.days * 86400000 : 0
  const result = articles.filter((article) => {
    const haystack = `${article.title} ${article.description} ${article.source} ${article.tag}`.toLowerCase()
    const matchesSearch = !term || haystack.includes(term)
    const matchesCategory = options.categories.length === 0 || options.categories.includes(article.category)
    const matchesSource = options.sources.length === 0 || options.sources.includes(article.source)
    const matchesDate = !cutoff || Date.parse(article.publishedAt) >= cutoff
    return matchesSearch && matchesCategory && matchesSource && matchesDate
  })
  return [...result].sort((a, b) => {
    if (options.sort === 'source') return a.source.localeCompare(b.source, 'de')
    return options.sort === 'newest' ? Date.parse(b.publishedAt) - Date.parse(a.publishedAt) : Date.parse(a.publishedAt) - Date.parse(b.publishedAt)
  })
}

export function mergeArticles(existing: Article[], incoming: Article[]): Article[] {
  const merged = new Map(existing.map((article) => [article.id, article]))
  incoming.forEach((article) => merged.set(article.id, { ...merged.get(article.id), ...article }))
  return [...merged.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
}

export const demoArticles: Article[] = [
  { id: 'demo-ai', title: 'Signal Desk ist bereit für deinen nächsten Deep Dive', description: 'Demo-Karte für den Offline- und Empty-State-Test. Live-Artikel werden nach dem ersten Abruf ersetzt.', source: 'Signal Desk Demo', url: 'https://www.gdeltproject.org/', publishedAt: new Date().toISOString(), retrievedAt: new Date().toISOString(), category: 'ai', tag: 'Demo' },
  { id: 'demo-security', title: 'Warum gute News-Produkte ihre Quellen sichtbar machen', description: 'Beispieldatensatz: Transparenz, Original-Links und klare Attribution gehören ins Interface.', source: 'Signal Desk Demo', url: 'https://www.w3.org/TR/WCAG22/', publishedAt: new Date(Date.now() - 3600000).toISOString(), retrievedAt: new Date().toISOString(), category: 'security', tag: 'Demo' },
]
