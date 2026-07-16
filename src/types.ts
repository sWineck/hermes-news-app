export type CategoryId = 'ai' | 'web' | 'infra' | 'security' | 'design' | 'productivity' | 'other'

export type Category = {
  id: CategoryId
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
  publishedAt: string
  category: CategoryId
  tag: string
}

export const categories: Category[] = [
  { id: 'ai', label: 'KI & Agenten', eyebrow: '01 / Intelligence', query: 'AI agents OR LLM OR MCP', accent: '#d6ff5f' },
  { id: 'web', label: 'Web & Frontend', eyebrow: '02 / Interface', query: 'React OR TypeScript OR frontend', accent: '#6ce5e8' },
  { id: 'infra', label: 'Self-hosting', eyebrow: '03 / Systems', query: 'Docker OR self-hosting OR Kubernetes', accent: '#ffbd6b' },
  { id: 'security', label: 'Security & Privacy', eyebrow: '04 / Trust', query: 'cybersecurity OR CVE OR OAuth', accent: '#ff7c92' },
  { id: 'design', label: 'Design & UX', eyebrow: '05 / Craft', query: 'design systems OR WCAG OR UX', accent: '#c6a7ff' },
  { id: 'productivity', label: 'Automation', eyebrow: '06 / Momentum', query: 'automation OR SaaS OR APIs', accent: '#8cf0bd' },
  { id: 'other', label: 'Weitere', eyebrow: '07 / Elsewhere', query: '', accent: '#aeb8c9' },
]

export const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category])) as Record<CategoryId, Category>

export function categorizeArticle(title: string, description = ''): CategoryId {
  const haystack = `${title} ${description}`.toLowerCase()
  const ordered: CategoryId[] = ['ai', 'security', 'infra', 'web', 'design', 'productivity']
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
    publishedAt,
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

export function filterArticles(articles: Article[], search: string, category: CategoryId | 'all', sort: 'newest' | 'oldest' = 'newest'): Article[] {
  const term = search.trim().toLowerCase()
  const result = articles.filter((article) => {
    const matchesCategory = category === 'all' || article.category === category
    const matchesSearch = !term || `${article.title} ${article.description} ${article.source}`.toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })
  return [...result].sort((a, b) => sort === 'newest' ? Date.parse(b.publishedAt) - Date.parse(a.publishedAt) : Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
}

export const demoArticles: Article[] = [
  { id: 'demo-ai', title: 'Signal Desk ist bereit für deinen nächsten Deep Dive', description: 'Demo-Karte für den Offline- und Empty-State-Test. Live-Artikel werden nach dem ersten Abruf ersetzt.', source: 'Signal Desk Demo', url: 'https://www.gdeltproject.org/', publishedAt: new Date().toISOString(), category: 'ai', tag: 'Demo' },
  { id: 'demo-security', title: 'Warum gute News-Produkte ihre Quellen sichtbar machen', description: 'Beispieldatensatz: Transparenz, Original-Links und klare Attribution gehören ins Interface.', source: 'Signal Desk Demo', url: 'https://www.w3.org/TR/WCAG22/', publishedAt: new Date(Date.now() - 3600000).toISOString(), category: 'security', tag: 'Demo' },
]
