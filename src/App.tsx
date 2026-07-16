import { useEffect, useMemo, useState } from 'react'
import { fetchNews } from './api'
import { Article, categories, categoryMap, demoArticles, filterArticles, CategoryId } from './types'
import './styles.css'

const STORAGE_KEY = 'signal-desk-favorites'

type Status = 'idle' | 'loading' | 'success' | 'error'

function loadFavorites(): Article[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Article[] } catch { return [] }
}

function formatDate(value: string) {
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) } catch { return 'unbekannt' }
}

function App() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('ai')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [articles, setArticles] = useState<Article[]>(demoArticles)
  const [favorites, setFavorites] = useState<Article[]>(loadFavorites)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('signal-desk-theme') !== 'light')
  const [showSaved, setShowSaved] = useState(false)

  const visibleArticles = useMemo(() => filterArticles(showSaved ? favorites : articles, search, showSaved ? 'all' : activeCategory, sort), [articles, favorites, activeCategory, search, sort, showSaved])
  const favoriteIds = useMemo(() => new Set(favorites.map((article) => article.id)), [favorites])

  useEffect(() => { document.documentElement.dataset.theme = isDark ? 'dark' : 'light'; localStorage.setItem('signal-desk-theme', isDark ? 'dark' : 'light') }, [isDark])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)) }, [favorites])

  async function refresh() {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    setStatus('loading'); setError('')
    try {
      const fresh = await fetchNews(activeCategory, controller.signal)
      setArticles(fresh); setLastUpdated(new Date().toISOString()); setStatus('success')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error && cause.name === 'AbortError' ? 'Der Abruf dauerte zu lange. Bitte versuche es erneut.' : cause instanceof Error ? cause.message : 'Die Nachrichten konnten nicht geladen werden.')
    } finally { window.clearTimeout(timeout) }
  }

  function toggleFavorite(article: Article) {
    setFavorites((current) => current.some((item) => item.id === article.id) ? current.filter((item) => item.id !== article.id) : [article, ...current])
  }

  const active = categoryMap[activeCategory]
  const statusLabel = status === 'loading' ? 'Synchronisiere' : status === 'error' ? 'Quelle nicht erreichbar' : status === 'success' ? 'Live verbunden' : 'Bereit für deinen Feed'

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Signal Desk Startseite"><span className="brand-mark">S</span><span>signal<span className="brand-muted">/</span>desk</span></a>
      <div className="topbar-actions">
        <span className={`connection-dot ${status === 'error' ? 'is-error' : ''}`} aria-hidden="true" />
        <span className="topbar-status">{statusLabel}</span>
        <button className="icon-button" onClick={() => setIsDark((value) => !value)} aria-label={isDark ? 'Helles Theme aktivieren' : 'Dunkles Theme aktivieren'}>{isDark ? '☼' : '☾'}</button>
      </div>
    </header>

    <main>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy"><p className="kicker">PERSONAL INTELLIGENCE BRIEF / 2026</p><h1 id="page-title">Die Welt, <em>sortiert.</em></h1><p className="hero-lede">Ein ruhiger Ort für die Signale, die deinen nächsten Gedanken auslösen.</p></div>
        <div className="hero-meta"><span className="meta-label">Monitor status</span><strong>{status === 'success' ? 'Live · just now' : 'Local preview'}</strong><span className="pulse" aria-hidden="true" /></div>
      </section>

      <section className="control-strip" aria-label="News-Steuerung">
        <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Signale, Quellen, Themen suchen …" aria-label="Nachrichten durchsuchen" />{search && <button onClick={() => setSearch('')} aria-label="Suche löschen">×</button>}</label>
        <div className="control-actions"><button className={`saved-toggle ${showSaved ? 'active' : ''}`} onClick={() => setShowSaved((value) => !value)} aria-pressed={showSaved}>♡ <span>Gespeichert</span><b>{favorites.length}</b></button><button className="refresh-button" onClick={refresh} disabled={status === 'loading'}>{status === 'loading' ? 'Lädt …' : '↻ Aktualisieren'}</button></div>
      </section>

      <section className="category-row" aria-label="Kategorien">
        <div className="section-label">Curated channels</div>
        <div className="category-list">{categories.map((category) => <button key={category.id} className={`category-chip ${activeCategory === category.id && !showSaved ? 'active' : ''}`} onClick={() => { setShowSaved(false); setActiveCategory(category.id) }} aria-pressed={activeCategory === category.id && !showSaved}><span className="chip-dot" style={{ background: category.accent }} />{category.label}</button>)}</div>
      </section>

      <section className="feed-heading"><div><p className="kicker">{showSaved ? 'YOUR SHORTLIST' : active.eyebrow}</p><h2>{showSaved ? 'Gespeicherte Signale' : active.label}</h2><p className="section-description">{showSaved ? 'Deine persönlichen Lesestücke — lokal auf diesem Gerät gespeichert.' : `Live query · ${active.query || 'Alle Themen'}`}</p></div><label className="sort-select">Sortieren<select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')} aria-label="Sortierung auswählen"><option value="newest">Neueste zuerst</option><option value="oldest">Älteste zuerst</option></select></label></section>

      {status === 'error' && <div className="alert" role="alert"><strong>Live-Sync pausiert.</strong><span>{error} Die Vorschau bleibt verfügbar.</span><button onClick={refresh}>Erneut versuchen</button></div>}
      {status === 'loading' && <div className="loading-bar" role="status"><span />Artikel werden aus dem globalen News-Monitor geladen …</div>}
      {visibleArticles.length > 0 ? <div className="article-grid">{visibleArticles.map((article, index) => <ArticleCard key={article.id} article={article} featured={index === 0 && !search && !showSaved} saved={favoriteIds.has(article.id)} onToggle={() => toggleFavorite(article)} />)}</div> : <div className="empty-state"><span className="empty-orbit">∅</span><h3>Keine Signale gefunden.</h3><p>Versuche einen anderen Suchbegriff oder setze den Filter zurück.</p><button onClick={() => { setSearch(''); setShowSaved(false) }}>Ansicht zurücksetzen</button></div>}

      <footer className="footer"><span>Signal Desk / personal news intelligence</span><span>{lastUpdated ? `Zuletzt aktualisiert ${formatDate(lastUpdated)}` : 'Demo-Daten aktiv · Live-Quelle per Aktualisieren'}</span><a href="https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/" target="_blank" rel="noreferrer">Quelle: GDELT DOC ↗</a></footer>
    </main>
  </div>
}

function ArticleCard({ article, featured, saved, onToggle }: { article: Article; featured: boolean; saved: boolean; onToggle: () => void }) {
  return <article className={`article-card ${featured ? 'featured' : ''}`}><div className="card-top"><span className="article-tag">{article.tag}</span><button className={`save-button ${saved ? 'saved' : ''}`} onClick={onToggle} aria-label={saved ? 'Artikel aus gespeicherten entfernen' : 'Artikel speichern'} aria-pressed={saved}>{saved ? '♥' : '♡'}</button></div>{featured && <div className="featured-poster" aria-hidden="true"><span>LIVE<br /><b>SCAN</b></span><i>↗</i></div>}<div className="card-body"><p className="article-date">{formatDate(article.publishedAt)} · {article.source}</p><h3><a href={article.url} target="_blank" rel="noreferrer">{article.title}</a></h3><p className="article-description">{article.description}</p></div><div className="card-footer"><span>{categoryMap[article.category].label}</span><a href={article.url} target="_blank" rel="noreferrer" aria-label={`Originalartikel öffnen: ${article.title}`}>Lesen ↗</a></div></article>
}

export default App
