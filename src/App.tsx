import { FormEvent, useEffect, useMemo, useState } from 'react'
import { fetchNews, testFeed } from './api'
import { Article, categories, categoryMap, demoArticles, FeedSource, FilterOptions, filterArticlesAdvanced, mergeArticles, CategoryId } from './types'
import './styles.css'

const APP_NAME = 'Hermes News App'
const ARTICLE_STORAGE = 'hermes-news-articles'
const FAVORITE_STORAGE = 'hermes-news-favorites'
const FEED_STORAGE = 'hermes-news-feeds'
const REFRESH_STORAGE = 'hermes-news-refresh'

type View = 'dashboard' | 'rss' | 'contact' | 'imprint' | 'privacy'
type Status = 'idle' | 'loading' | 'success' | 'error'

function loadJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}

function formatDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'unbekannt' : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

function timeAgo(value: string | null, now: number): string {
  if (!value) return 'noch kein erfolgreicher Refresh'
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000))
  if (seconds < 60) return `vor ${seconds} Sek.`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  return `vor ${Math.floor(hours / 24)} Tagen`
}

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<FilterOptions['sort']>('newest')
  const [days, setDays] = useState(0)
  const [articles, setArticles] = useState<Article[]>(() => loadJson(ARTICLE_STORAGE, demoArticles))
  const [favorites, setFavorites] = useState<Article[]>(() => loadJson(FAVORITE_STORAGE, []))
  const [feeds, setFeeds] = useState<FeedSource[]>(() => loadJson(FEED_STORAGE, []))
  const [status, setStatus] = useState<Status>('idle')
  const [provider, setProvider] = useState('Lokale Vorschau')
  const [error, setError] = useState('')
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState<string | null>(() => loadJson(REFRESH_STORAGE, null))
  const [clock, setClock] = useState(Date.now())
  const [isDark, setIsDark] = useState(() => localStorage.getItem('hermes-news-theme') !== 'light')
  const [showSaved, setShowSaved] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [feedName, setFeedName] = useState('')
  const [feedUrl, setFeedUrl] = useState('')
  const [feedChannel, setFeedChannel] = useState<Exclude<CategoryId, 'all'>>('ai')
  const [feedMessage, setFeedMessage] = useState('')

  const filterOptions = useMemo<FilterOptions>(() => ({
    search,
    categories: activeCategory === 'all' ? [] : [activeCategory],
    sources: [],
    days,
    sort,
  }), [activeCategory, days, search, sort])
  const visibleArticles = useMemo(() => filterArticlesAdvanced(showSaved ? favorites : articles, filterOptions), [articles, favorites, filterOptions, showSaved])
  const sourceNames = useMemo(() => [...new Set(articles.map((article) => article.source))].sort(), [articles])
  const favoriteIds = useMemo(() => new Set(favorites.map((article) => article.id)), [favorites])
  const active = activeCategory === 'all' ? null : categoryMap[activeCategory]
  const statusLabel = status === 'loading' ? 'Aktualisierung läuft' : status === 'error' ? 'Live-Quelle eingeschränkt' : status === 'success' ? 'Live verbunden' : 'Bereit für deinen Feed'
  const statusTone = status === 'success' ? 'success' : status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'idle'

  useEffect(() => { document.documentElement.dataset.theme = isDark ? 'dark' : 'light'; localStorage.setItem('hermes-news-theme', isDark ? 'dark' : 'light') }, [isDark])
  useEffect(() => { localStorage.setItem(ARTICLE_STORAGE, JSON.stringify(articles)) }, [articles])
  useEffect(() => { localStorage.setItem(FAVORITE_STORAGE, JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { localStorage.setItem(FEED_STORAGE, JSON.stringify(feeds)) }, [feeds])
  useEffect(() => { if (lastSuccessfulRefresh) localStorage.setItem(REFRESH_STORAGE, JSON.stringify(lastSuccessfulRefresh)) }, [lastSuccessfulRefresh])
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { document.title = `${APP_NAME} · News Dashboard` }, [])

  async function refresh() {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    setStatus('loading'); setError('')
    try {
      const result = await fetchNews(activeCategory === 'all' ? 'ai' : activeCategory, controller.signal, feeds)
      setArticles((current) => mergeArticles(current, result.articles))
      setFeeds((current) => current.map((feed) => result.feedResults.find((item) => item.feed.id === feed.id)?.feed || feed))
      setProvider(result.provider === 'mixed' ? 'GDELT/Hacker News + RSS' : result.provider === 'gdelt' ? 'GDELT DOC' : 'Hacker News Fallback')
      const stamp = new Date().toISOString()
      setLastSuccessfulRefresh(stamp); setClock(Date.now()); setStatus('success')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error && cause.name === 'AbortError' ? 'Der Abruf dauerte zu lange.' : cause instanceof Error ? cause.message : 'Die Nachrichten konnten nicht geladen werden.')
    } finally { window.clearTimeout(timeout) }
  }

  function toggleFavorite(article: Article) { setFavorites((current) => current.some((item) => item.id === article.id) ? current.filter((item) => item.id !== article.id) : [article, ...current]) }
  function toggleExpanded(id: string) { setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next }) }

  async function addFeed(event: FormEvent) {
    event.preventDefault(); setFeedMessage('')
    try {
      const draft: FeedSource = { id: crypto.randomUUID(), name: feedName.trim() || new URL(feedUrl).hostname, url: feedUrl.trim(), channel: feedChannel, enabled: true, status: 'untested' }
      const result = await testFeed(draft)
      setFeeds((current) => [result.feed, ...current]); setArticles((current) => mergeArticles(current, result.articles)); setFeedName(''); setFeedUrl(''); setFeedMessage(`${result.articles.length} Artikel aus ${result.feed.name} geladen und gespeichert.`)
    } catch (cause) { setFeedMessage(cause instanceof Error ? cause.message : 'Feed konnte nicht validiert werden.') }
  }

  async function retestFeed(feed: FeedSource) {
    try { const result = await testFeed(feed); setFeeds((current) => current.map((item) => item.id === feed.id ? result.feed : item)); setArticles((current) => mergeArticles(current, result.articles)); setFeedMessage(`${result.articles.length} Artikel aus ${feed.name} aktualisiert.`) }
    catch (cause) { setFeeds((current) => current.map((item) => item.id === feed.id ? { ...item, status: 'error', error: cause instanceof Error ? cause.message : 'Abruf fehlgeschlagen.' } : item)); setFeedMessage(cause instanceof Error ? cause.message : 'Feed konnte nicht geladen werden.') }
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setView('dashboard')} aria-label={`${APP_NAME} Startseite`}><span className="brand-mark">H</span><span>Hermes <span className="brand-muted">News App</span></span></button>
      <nav className="main-nav" aria-label="Hauptnavigation">{([['dashboard', 'News'], ['rss', 'RSS-Feeds'], ['contact', 'Kontakt'], ['imprint', 'Impressum'], ['privacy', 'Datenschutz']] as [View, string][]).map(([id, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>)}</nav>
      <div className="topbar-actions"><span className={`connection-dot ${statusTone}`} aria-hidden="true" /><span className="topbar-status">{statusLabel}</span><button className="icon-button" onClick={() => setIsDark((value) => !value)} aria-label={isDark ? 'Helles Theme aktivieren' : 'Dunkles Theme aktivieren'}>{isDark ? '☼' : '☾'}</button></div>
    </header>

    {view === 'dashboard' && <main>
      <section className="hero" aria-labelledby="page-title"><div className="hero-copy"><p className="kicker">HERMES NEWS APP / PERSONAL INTELLIGENCE</p><h1 id="page-title">Die Welt, <em>sortiert.</em></h1><p className="hero-lede">Ein ruhiger Ort für die Signale, die deinen nächsten Gedanken auslösen.</p></div><div className="hero-visual" aria-hidden="true"><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /><span className="hero-glyph">H</span></div><div className="hero-meta"><span className="meta-label">Monitor status</span><strong>{status === 'success' ? 'Live · just now' : 'Lokaler News-Pool'}</strong><span className={`pulse ${statusTone}`} aria-hidden="true" /></div></section>
      <section className="control-strip" aria-label="News-Steuerung"><label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Signale, Quellen, Themen suchen …" aria-label="Nachrichten durchsuchen" />{search && <button onClick={() => setSearch('')} aria-label="Suche löschen">×</button>}</label><div className="control-actions"><button className="saved-toggle" onClick={() => setShowSaved((value) => !value)} aria-pressed={showSaved} aria-label={`Gespeicherte Artikel ${showSaved ? 'ausblenden' : 'anzeigen'}, ${favorites.length} gespeichert`}>♡ <span>Gespeichert</span><b>{favorites.length}</b></button><button className="refresh-button" onClick={refresh} disabled={status === 'loading'}>{status === 'loading' ? 'Lädt …' : '↻ Aktualisieren'}</button></div></section>
      <section className="filter-panel" aria-label="Filter und Kategorien"><div className="section-label">Curated channels</div><div className="category-list"><button className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => { setShowSaved(false); setActiveCategory('all') }} aria-pressed={activeCategory === 'all'}><span className="chip-dot" />Alle <b>{articles.length}</b></button>{categories.map((category) => <button key={category.id} className={`category-chip ${activeCategory === category.id ? 'active' : ''}`} onClick={() => { setShowSaved(false); setActiveCategory(category.id) }} aria-pressed={activeCategory === category.id}><span className="chip-dot" style={{ background: category.accent }} />{category.label}<b>{articles.filter((article) => article.category === category.id).length}</b></button>)}</div><div className="filter-options"><label>Zeitraum<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="0">Alle Zeit</option><option value="1">Letzte 24 Stunden</option><option value="7">Letzte 7 Tage</option><option value="30">Letzte 30 Tage</option></select></label><label>Sortierung<select value={sort} onChange={(event) => setSort(event.target.value as FilterOptions['sort'])}><option value="newest">Neueste zuerst</option><option value="oldest">Älteste zuerst</option><option value="source">Nach Quelle</option></select></label></div></section>
      <section className="feed-heading"><div><p className="kicker">{showSaved ? 'YOUR SHORTLIST' : active ? active.eyebrow : 'NEWS POOL / ALL CHANNELS'}</p><h2>{showSaved ? 'Gespeicherte Signale' : active ? active.label : 'Alle Signale'}</h2><p className="section-description">{provider} · {visibleArticles.length} sichtbare Artikel · {timeAgo(lastSuccessfulRefresh, clock)}</p></div><div className="refresh-meta" aria-live="polite"><span className={`status-badge ${statusTone}`}>{status === 'success' ? 'LIVE VERBUNDEN' : statusLabel}</span><small>Letzter erfolgreicher Refresh: {lastSuccessfulRefresh ? formatDate(lastSuccessfulRefresh) : 'noch nicht ausgeführt'}</small></div></section>
      {status === 'error' && <div className="alert" role="alert"><strong>Live-Sync eingeschränkt.</strong><span>{error} Gespeicherte Artikel bleiben verfügbar.</span><button onClick={refresh}>Erneut versuchen</button></div>}
      {status === 'loading' && <div className="loading-bar" role="status"><span />Quellen werden geprüft und der News-Pool wird dedupliziert …</div>}
      {visibleArticles.length > 0 ? <div className="article-grid">{visibleArticles.map((article, index) => <ArticleCard key={article.id} article={article} featured={index === 0 && !search && activeCategory === 'all'} saved={favoriteIds.has(article.id)} expanded={expanded.has(article.id)} onToggle={() => toggleFavorite(article)} onExpand={() => toggleExpanded(article.id)} />)}</div> : <div className="empty-state"><span className="empty-orbit">∅</span><h3>Keine Signale gefunden.</h3><p>Versuche einen anderen Suchbegriff oder setze die Filter zurück.</p><button onClick={() => { setSearch(''); setDays(0); setShowSaved(false); setActiveCategory('all') }}>Filter zurücksetzen</button></div>}
      <footer className="footer"><span>{APP_NAME} / personal news intelligence</span><span>{lastSuccessfulRefresh ? `Refresh ${timeAgo(lastSuccessfulRefresh, clock)}` : 'Demo-Daten aktiv · Live-Quelle per Aktualisieren'}</span><button onClick={() => setView('privacy')}>Datenschutz</button></footer>
    </main>}

    {view === 'rss' && <InfoPage eyebrow="SOURCES / RSS" title="Deine Quellen, dein Pool." intro="Füge RSS- oder Atom-Feeds hinzu. Jeder Feed wird vor dem Speichern tatsächlich abgerufen und auf verwertbare Artikel geprüft."><form className="feed-form" onSubmit={addFeed}><label>Feed-Name<input value={feedName} onChange={(event) => setFeedName(event.target.value)} placeholder="z. B. W3C News" /></label><label>RSS-/Atom-URL<input required type="url" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://example.org/feed.xml" /></label><label>Channel<select value={feedChannel} onChange={(event) => setFeedChannel(event.target.value as Exclude<CategoryId, 'all'>)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><button className="refresh-button" type="submit">Feed testen & speichern</button></form>{feedMessage && <p className="form-message" role="status">{feedMessage}</p>}<div className="feed-list">{feeds.length === 0 ? <div className="empty-state compact"><h3>Noch keine eigenen Feeds.</h3><p>Die eingebauten Live-Quellen funktionieren unabhängig davon weiter.</p></div> : feeds.map((feed) => <article className="feed-row" key={feed.id}><div><strong>{feed.name}</strong><small>{feed.url} · {categoryMap[feed.channel].label}</small></div><span className={`status-badge ${feed.status === 'ready' ? 'success' : feed.status === 'error' ? 'error' : 'idle'}`}>{feed.status === 'ready' ? 'BEREIT' : feed.status === 'error' ? 'FEHLER' : 'UNGETESTET'}</span><button onClick={() => retestFeed(feed)}>Erneut testen</button><button onClick={() => setFeeds((current) => current.filter((item) => item.id !== feed.id))} aria-label={`${feed.name} löschen`}>Löschen</button>{feed.error && <small className="feed-error">{feed.error}</small>}</article>)}</div></InfoPage>}
    {view === 'contact' && <InfoPage eyebrow="HERMES NEWS APP / KONTAKT" title="Sag Hallo." intro="Diese Kontaktseite ist vorbereitet. Ergänze deine gewünschten Kontaktdaten, bevor die App öffentlich als fertige rechtliche Präsenz verwendet wird."><div className="placeholder-card"><strong>Kontaktangaben ausstehend</strong><p>Bitte Betreibername, E-Mail-Adresse und optional eine weitere Kontaktmöglichkeit als sichere, bewusst freigegebene Daten ergänzen.</p></div></InfoPage>}
    {view === 'imprint' && <InfoPage eyebrow="HERMES NEWS APP / IMPRESSUM" title="Transparenz vor Vollständigkeit." intro="Diese Seite enthält bewusst keine erfundenen Betreiberangaben. Sie muss vor einer öffentlichen Nutzung mit den korrekten Impressumsdaten ausgefüllt werden."><div className="placeholder-card"><strong>Impressumsdaten ausstehend</strong><p>Keine Fantangaben: Verantwortliche Stelle, Anschrift und Kontakt werden erst nach deiner Freigabe eingetragen.</p></div></InfoPage>}
    {view === 'privacy' && <InfoPage eyebrow="HERMES NEWS APP / DATENSCHUTZ" title="Daten klar benennen." intro="Die App speichert im aktuellen Prototyp Artikel, Favoriten, RSS-Konfiguration, Theme und Refresh-Zeitpunkt lokal im Browser. Live-Provider erhalten nur die für den Abruf nötigen Requests."><div className="placeholder-card"><strong>Vorläufiger Datenschutzhinweis</strong><p>Vor dem produktiven Einsatz muss dieser Hinweis an Speicherstrategie, Hosting, RSS-Proxy und konkrete Betreiberangaben angepasst werden.</p></div></InfoPage>}
  </div>
}

function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <main className="info-page"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p className="hero-lede">{intro}</p>{children}</main>
}

function ArticleCard({ article, featured, saved, expanded, onToggle, onExpand }: { article: Article; featured: boolean; saved: boolean; expanded: boolean; onToggle: () => void; onExpand: () => void }) {
  return <article className={`article-card ${featured ? 'featured' : ''} ${expanded ? 'is-expanded' : ''}`}>{featured && <div className="featured-poster" aria-hidden="true"><span>LIVE<br /><b>SCAN</b></span><i>↗</i></div>}<div className="card-top"><span className="article-tag">{article.tag}</span><button className={`save-button ${saved ? 'saved' : ''}`} onClick={onToggle} aria-label={saved ? 'Artikel aus gespeicherten entfernen' : 'Artikel speichern'} aria-pressed={saved}>{saved ? '♥' : '♡'}</button></div><div className="card-body"><p className="article-date">{formatDate(article.publishedAt)} · {article.source}</p><h3><a href={article.url} target="_blank" rel="noreferrer">{article.title}</a></h3><p id={`description-${article.id}`} className="article-description">{article.description}</p>{article.description.length > 180 && <button className="expand-button" onClick={onExpand} aria-expanded={expanded} aria-controls={`description-${article.id}`}>{expanded ? 'Weniger anzeigen ↑' : 'Mehr anzeigen ↓'}</button>}</div><div className="card-footer"><span>{categoryMap[article.category].label}</span><a href={article.url} target="_blank" rel="noreferrer" aria-label={`Originalartikel öffnen: ${article.title}`}>Original ↗</a></div></article>
}

export default App
