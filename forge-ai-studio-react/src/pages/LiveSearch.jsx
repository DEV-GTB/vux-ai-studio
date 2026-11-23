// VUX LIVE SEARCH — unified Internet Intelligence UI
//
// Four independent tools in one interface:
//   search_web(query)      -> SearXNG / Wikipedia
//   search_news(query)     -> GDELT / NewsAPI / NewsData / Wikipedia
//   read_website(url)      -> Jina Reader / direct HTML
//   analyze_website(url)   -> cheerio metadata + Jina content
//   digest_news(query)     -> AI-written professional paragraphs (Gemini)
//
// All API calls go to the backend (/api/search/*). Keys live only on the
// backend (.env, gitignored). SSRF protection is enforced on the backend.

import { useState, useRef, useEffect } from 'react'
import { apiUrl } from '../lib/api.js'

const TABS = [
  { id: 'web', label: 'Search Web', icon: '🔍', desc: 'General internet search' },
  { id: 'news', label: 'News Digest', icon: '📰', desc: 'AI-explained headlines & current events' },
  { id: 'read', label: 'Read Website', icon: '📖', desc: 'Readable page content' },
  { id: 'analyze', label: 'Analyze Website', icon: '🧩', desc: 'Site structure & metadata' },
  { id: 'history', label: 'Digest History', icon: '🗂️', desc: 'Previously digested news items' },
]

export function LiveSearch({ setCurrentPage: _setCurrentPage, username: _username }) {
  const [activeTab, setActiveTab] = useState('news')

  // Web search state
  const [webQuery, setWebQuery] = useState('')
  const [webResults, setWebResults] = useState([])
  const [webLoading, setWebLoading] = useState(false)
  const [webError, setWebError] = useState('')

  // News digest state
  const [newsQuery, setNewsQuery] = useState('')
  const [newsItems, setNewsItems] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState('')

  // Read website state
  const [readUrl, setReadUrl] = useState('')
  const [readContent, setReadContent] = useState('')
  const [readLoading, setReadLoading] = useState(false)
  const [readError, setReadError] = useState('')

  // Analyze website state
  const [analyzeUrl, setAnalyzeUrl] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  // Digest history state
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const sampleWebQueries = [
    'VUX AI Studio documentation',
    'how to build a React chat app',
    'TypeScript optional chaining',
    'free public APIs for news',
  ]
  const sampleNewsQueries = [
    'artificial intelligence news',
    'technology updates today',
    'space exploration 2026',
    'climate change latest',
  ]

  const formatDate = (iso) => {
    if (!iso) return ''
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  const searchWeb = async () => {
    if (!webQuery.trim()) return
    setWebLoading(true)
    setWebError('')
    setWebResults([])
    try {
      const response = await fetch(apiUrl('/api/search/web'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: webQuery.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Web search failed')
      setWebResults(data.results || [])
    } catch (error) {
      setWebError(error.message || 'Web search could not complete.')
      console.error('Web search error:', error)
    } finally {
      setWebLoading(false)
    }
  }

  const digestNews = async () => {
    if (!newsQuery.trim()) return
    setNewsLoading(true)
    setNewsError('')
    setNewsItems([])
    try {
      const response = await fetch(apiUrl('/api/search/news/digest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newsQuery.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'News digest failed')
      setNewsItems(data.items || [])
    } catch (error) {
      setNewsError(error.message || 'News digest could not complete.')
      console.error('News digest error:', error)
    } finally {
      setNewsLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch(apiUrl('/api/search/news/digest/history?limit=30'), {
        headers: { 'Accept': 'application/json' },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load history')
      setHistoryItems(data.items || [])
    } catch (error) {
      console.error('History load error:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const readWebsite = async () => {
    if (!readUrl.trim()) return
    setReadLoading(true)
    setReadError('')
    setReadContent('')
    try {
      const response = await fetch(apiUrl('/api/search/read'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: readUrl.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not read website')
      setReadContent(data.content || '')
    } catch (error) {
      setReadError(error.message || 'Website could not be read.')
      console.error('Read website error:', error)
    } finally {
      setReadLoading(false)
    }
  }

  const analyzeWebsite = async () => {
    if (!analyzeUrl.trim()) return
    setAnalyzeLoading(true)
    setAnalyzeError('')
    setAnalysis(null)
    try {
      const response = await fetch(apiUrl('/api/search/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: analyzeUrl.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not analyze website')
      setAnalysis(data)
    } catch (error) {
      setAnalyzeError(error.message || 'Website could not be analyzed.')
      console.error('Analyze website error:', error)
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const renderResultCard = (result) => (
    <article
      key={result.url || result.title}
      className="bg-forge-surface border border-forge-border rounded-xl p-5 hover:border-forge-primary/50 transition-all group"
    >
      <div className="flex items-start gap-2 mb-1">
        <span className="text-xs font-medium text-forge-primary">{result.provider}</span>
        {result.status && result.status !== 'ok' && (
          <span className="text-xs font-medium text-red-400">{result.status}</span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{result.title}</h3>
      {result.description && (
        <p className="text-sm text-forge-textMuted mb-3 line-clamp-2">{result.description}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-forge-textMuted mb-2">
        {result.publisher && <span>{result.publisher}</span>}
        {result.date && <span>• {formatDate(result.date)}</span>}
        <span>retrieved {formatDate(result.retrievalTimestamp)}</span>
      </div>
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-forge-primary hover:underline flex items-center gap-1"
      >
        Open source ↗
      </a>
    </article>
  )

  const renderNewsItem = (item, index) => {
    const hasDigest = Boolean(item.aiDigest)
    return (
      <article
        key={item.url || item.title || index}
        className={`bg-forge-surface border border-forge-border rounded-xl p-5 mb-4 transition-all ${
          hasDigest ? 'border-forge-primary/50 shadow-sm' : 'border-forge-border'
        }`}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="text-xs font-medium text-forge-primary">{item.provider}</span>
          {item.aiDigestError && (
            <span className="text-xs font-medium text-orange-400">AI writing pending</span>
          )}
          {!item.aiDigest && !item.aiDigestError && (
            <span className="text-xs font-medium text-forge-textMuted">Raw</span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{item.title}</h3>
        <p className="text-sm text-forge-textMuted mb-3 line-clamp-2">
          {item.description || '(no description)'}
        </p>
        <div className="flex items-center gap-2 text-xs text-forge-textMuted mb-3">
          {item.publisher && <span>{item.publisher}</span>}
          {item.date && <span>• {formatDate(item.date)}</span>}
          <span>• retrieved {formatDate(item.retrievalTimestamp)}</span>
        </div>

        {/* AI-written professional paragraph — the core deliverable */ }
        {item.aiDigest && (
          <div className="mb-4 pl-4 border-l-2 border-forge-primary bg-forge-surfaceLow rounded-r-lg p-3">
            <p className="text-sm text-forge-text leading-relaxed">
              {item.aiDigest}
            </p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-forge-textMuted">
              <span>Written by VUX AI</span>
              {item.aiDigestModel && <span>• {item.aiDigestModel}</span>}
            </div>
          </div>
        )}

        {!item.aiDigest && item.aiDigestError && (
          <div className="mb-4 pl-4 border-l-2 border-orange-500 bg-orange-500/10 rounded-r-lg p-3">
            <p className="text-xs text-orange-200">
              AI paragraph pending: {item.aiDigestError}
            </p>
          </div>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-forge-primary hover:underline flex items-center gap-1"
        >
          Open source ↗
        </a>
      </article>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Top Bar */ }
      <header className="flex items-center justify-between px-4 lg:px-8 py-4 border-b border-forge-border bg-forge-surface/50 backdrop-blur-sm sticky top-0 z-10 slide-in">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-forge-primary to-forge-ai flex items-center justify-center glow-pulse">
            <span className="text-xl wave-animation">🌐</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">VUX Live Search</h1>
          <p className="text-sm text-forge-textMuted">Unified Internet Intelligence</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <button className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-forge-surfaceLow border border-forge-border flex items-center justify-center hover:bg-forge-surfaceHigh hover:border-forge-primary transition-all magnetic-button">
            🌙
          </button>
        </div>
      </header>

      {/* Main Content */ }
      <div className="p-4 lg:p-8 pb-24">
        {/* Tool Tabs */ }
        <div className="bg-forge-surface border border-forge-border rounded-2xl p-1 mb-6 scale-in">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === 'history') loadHistory() }}
                className={`whitespace-nowrap py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-forge-primary text-black border border-forge-primary'
                    : 'text-forge-textMuted hover:bg-forge-surfaceLow hover:text-white'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Panels */ }
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Input + controls (4 cols) */ }
          <div className="lg:col-span-4 space-y-6">
            {activeTab === 'web' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <span>🔍</span> Search Web
                </h2>
                <p className="text-sm text-forge-textMuted mb-4">{TABS.find((t) => t.id === 'web').desc}</p>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="Enter a search query..."
                    onKeyPress={(e) => e.key === 'Enter' && searchWeb()}
                    className="w-full bg-forge-surfaceLow border border-forge-border rounded-xl px-4 py-3 text-sm text-forge-text focus:outline-none focus:border-forge-primary transition-all disabled:opacity-50"
                    disabled={webLoading}
                  />
                  <button
                    onClick={searchWeb}
                    disabled={webLoading || !webQuery.trim()}
                    className="absolute right-2 top-2 w-10 h-10 rounded-lg bg-forge-primary text-black flex items-center justify-center hover:bg-forge-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {webLoading ? '⏳' : '🔍'}
                  </button>
                </div>
                {sampleWebQueries.length > 0 && (
                  <div>
                    <p className="text-xs text-forge-textMuted mb-2">Try these queries:</p>
                    <div className="flex flex-wrap gap-2">
                      {sampleWebQueries.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setWebQuery(q); searchWeb() }}
                          className="px-3 py-1.5 bg-forge-surfaceLow border border-forge-border rounded-lg text-xs hover:border-forge-primary transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {webError && (
                  <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
                    {webError}
                  </p>
                )}
                {webLoading && !webError && (
                  <p className="text-sm text-forge-textMuted italic">Searching...</p>
                )}
              </div>
            )}

            {activeTab === 'news' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <span>📰</span> News Digest
                </h2>
                <p className="text-sm text-forge-textMuted mb-4">
                  Real-time news fetched from live sources, then each story is explained by VUX AI in a professional paragraph.
                </p>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={newsQuery}
                    onChange={(e) => setNewsQuery(e.target.value)}
                    placeholder="e.g. artificial intelligence news"
                    onKeyPress={(e) => e.key === 'Enter' && digestNews()}
                    className="w-full bg-forge-surfaceLow border border-forge-border rounded-xl px-4 py-3 text-sm text-forge-text focus:outline-none focus:border-forge-primary transition-all disabled:opacity-50"
                    disabled={newsLoading}
                  />
                  <button
                    onClick={digestNews}
                    disabled={newsLoading || !newsQuery.trim()}
                    className="absolute right-2 top-2 w-10 h-10 rounded-lg bg-forge-primary text-black flex items-center justify-center hover:bg-forge-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {newsLoading ? '⏳' : '📰'}
                  </button>
                </div>
                {sampleNewsQueries.length > 0 && (
                  <div>
                    <p className="text-xs text-forge-textMuted mb-2">Try these topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {sampleNewsQueries.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setNewsQuery(q); digestNews() }}
                          className="px-3 py-1.5 bg-forge-surfaceLow border border-forge-border rounded-lg text-xs hover:border-forge-primary transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {newsError && (
                  <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
                    {newsError}
                  </p>
                )}
                {newsLoading && !newsError && (
                  <p className="text-sm text-forge-textMuted italic">Fetching news and writing AI paragraphs...</p>
                )}
              </div>
            )}

            {activeTab === 'read' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <span>📖</span> Read Website
                </h2>
                <p className="text-sm text-forge-textMuted mb-4">{TABS.find((t) => t.id === 'read').desc}</p>
                <div className="relative mb-4">
                  <input
                    type="url"
                    value={readUrl}
                    onChange={(e) => setReadUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    onKeyPress={(e) => e.key === 'Enter' && readWebsite()}
                    className="w-full bg-forge-surfaceLow border border-forge-border rounded-xl px-4 py-3 text-sm text-forge-text focus:outline-none focus:border-forge-primary transition-all disabled:opacity-50"
                    disabled={readLoading}
                  />
                  <button
                    onClick={readWebsite}
                    disabled={readLoading || !readUrl.trim()}
                    className="absolute right-2 top-2 w-10 h-10 rounded-lg bg-forge-primary text-black flex items-center justify-center hover:bg-forge-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {readLoading ? '⏳' : '📖'}
                  </button>
                </div>
                {readError && (
                  <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
                    {readError}
                  </p>
                )}
                {readLoading && !readError && (
                  <p className="text-sm text-forge-textMuted italic">Reading website...</p>
                )}
              </div>
            )}

            {activeTab === 'analyze' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <span>🧩</span> Analyze Website
                </h2>
                <p className="text-sm text-forge-textMuted mb-4">{TABS.find((t) => t.id === 'analyze').desc}</p>
                <div className="relative mb-4">
                  <input
                    type="url"
                    value={analyzeUrl}
                    onChange={(e) => setAnalyzeUrl(e.target.value)}
                    placeholder="https://example.com"
                    onKeyPress={(e) => e.key === 'Enter' && analyzeWebsite()}
                    className="w-full bg-forge-surfaceLow border border-forge-border rounded-xl px-4 py-3 text-sm text-forge-text focus:outline-none focus:border-forge-primary transition-all disabled:opacity-50"
                    disabled={analyzeLoading}
                  />
                  <button
                    onClick={analyzeWebsite}
                    disabled={analyzeLoading || !analyzeUrl.trim()}
                    className="absolute right-2 top-2 w-10 h-10 rounded-lg bg-forge-primary text-black flex items-center justify-center hover:bg-forge-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {analyzeLoading ? '⏳' : '🧩'}
                  </button>
                </div>
                {analyzeError && (
                  <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
                    {analyzeError}
                  </p>
                )}
                {analyzeLoading && !analyzeError && (
                  <p className="text-sm text-forge-textMuted italic">Analyzing website...</p>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <span>🗂️</span> Digest History
                </h2>
                <p className="text-sm text-forge-textMuted mb-4">
                  Every news item VUX AI has digested is stored here, one by one, so nothing is ever lost.
                </p>
                <button
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="px-4 py-2 bg-forge-primary text-black rounded-lg hover:bg-forge-primaryHover disabled:opacity-50 transition-all"
                >
                  {historyLoading ? '⏳' : '🔄 Refresh History'}
                </button>
                {historyLoading && (
                  <p className="text-sm text-forge-textMuted italic mt-2">Loading history...</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Results (8 cols) */ }
          <div className="lg:col-span-8 space-y-6">
            {activeTab === 'web' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                    <span>🔍</span> Web Results
                  </h2>
                  <span className="text-xs font-medium bg-forge-surfaceLow px-2 py-1 rounded text-forge-textMuted">
                    {webResults.length} result{webResults.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {webResults.length === 0 && !webLoading && !webError && (
                  <div className="text-center py-12">
                    <p className="text-forge-textMuted text-sm">Enter a query to search the web.</p>
                  </div>
                )}
                {webResults.map((result) => renderResultCard(result))}
              </div>
            )}

            {activeTab === 'news' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                    <span>📰</span> News Digest
                  </h2>
                  <span className="text-xs font-medium bg-forge-surfaceLow px-2 py-1 rounded text-forge-textMuted">
                    {newsItems.length} story{newsItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {newsItems.length === 0 && !newsLoading && !newsError && (
                  <div className="text-center py-12">
                    <p className="text-forge-textMuted text-sm">Enter a topic to get an AI-explained news digest.</p>
                  </div>
                )}
                {newsItems.map((item, i) => renderNewsItem(item, i))}
              </div>
            )}

            {activeTab === 'read' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                    <span>📖</span> Page Content
                  </h2>
                  <span className="text-xs font-medium bg-forge-surfaceLow px-2 py-1 rounded text-forge-textMuted">
                    {readContent ? `${Math.round(readContent.length / 1000)} KB` : '0 KB'}
                  </span>
                </div>
                {readContent ? (
                  <div className="whitespace-pre-wrap break-words text-sm text-forge-text leading-relaxed max-h-[600px] overflow-y-auto border border-forge-border rounded-lg p-4 bg-forge-surfaceLow">
                    {readContent}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-forge-textMuted text-sm">Enter a URL to read website content.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analyze' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                {analysis && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-forge-surfaceLow border border-forge-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Title</h3>
                        <p className="text-sm text-forge-text whitespace-pre-wrap">{analysis.title || '(none)'}</p>
                      </div>
                      <div className="bg-forge-surfaceLow border border-forge-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Domain</h3>
                        <p className="text-sm text-forge-text">{analysis.domain || '(none)'}</p>
                      </div>
                      <div className="bg-forge-surfaceLow border border-forge-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Canonical URL</h3>
                        <p className="text-sm text-forge-text truncate max-w-[200px]">{analysis.canonicalUrl || '(none)'}</p>
                      </div>
                      <div className="bg-forge-surfaceLow border border-forge-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Published</h3>
                        <p className="text-sm text-forge-text">{analysis.publishedDate || '(not available)'}</p>
                      </div>
                      <div className="bg-forge-surfaceLow border border-forge-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Language</h3>
                        <p className="text-sm text-forge-text">{analysis.language || '(not detected)'}</p>
                      </div>
                      <div className="bg-forge-surfaceLow border border-forge-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Author</h3>
                        <p className="text-sm text-forge-text">{analysis.author || '(not available)'}</p>
                      </div>
                    </div>

                    {analysis.description && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Description</h3>
                        <p className="text-sm text-forge-text whitespace-pre-wrap">{analysis.description}</p>
                      </div>
                    )}

                    {analysis.headings && analysis.headings.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Headings</h3>
                        <ul className="text-sm text-forge-text space-y-1 list-disc list-inside">
                          {analysis.headings.slice(0, 12).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.internalLinks && analysis.internalLinks.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Internal Links ({analysis.internalLinks.length})</h3>
                        <div className="space-y-1">
                          {analysis.internalLinks.slice(0, 10).map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-forge-primary hover:underline truncate block"
                            >
                              {link.text || link.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.images && analysis.images.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-forge-primary mb-2">Images ({analysis.images.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {analysis.images.slice(0, 8).map((img, i) => (
                            <div key={i} className="relative group">
                              <img
                                src={img.url}
                                alt={img.alt || 'image'}
                                className="w-20 h-20 object-cover rounded border border-forge-border opacity-60 group-hover:opacity-100 transition-opacity"
                              />
                              <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-white px-1 py-0.5 rounded-t opacity-0 group-hover:opacity-100 transition-opacity">
                                {img.alt || 'image'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-forge-textMuted mt-4">
                      Provider: {analysis.providers?.[0]?.name || 'Jina Reader / Direct HTML'} •
                      Status: {analysis.status} • Retrieved: {formatDate(analysis.retrievedAt)}
                    </div>
                  </>
                )}
                {!analysis && !analyzeLoading && !analyzeError && (
                  <div className="text-center py-12">
                    <p className="text-forge-textMuted text-sm">Enter a URL to analyze website structure.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-forge-surface border border-forge-border rounded-2xl p-6 scale-in">
                {historyLoading ? (
                  <div className="text-center py-12">
                    <p className="text-forge-textMuted text-sm italic">Loading digest history...</p>
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-forge-textMuted text-sm">No digested news yet. Run a News Digest first.</p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-forge-textMuted mb-4">
                      {historyItems.length} digested story{historyItems.length !== 1 ? 's' : ''} stored
                    </div>
                    {historyItems.map((item, i) => (
                      <div key={i} className="mb-4 border-b border-forge-border pb-4 last:border-0">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-xs font-medium text-forge-primary">{item.provider || 'stored'}</span>
                          {item.aiDigest && (
                            <span className="text-xs font-medium text-forge-primary">✓ AI-written</span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                        {item.aiDigest && (
                          <p className="text-sm text-forge-text leading-relaxed mb-2">
                            {item.aiDigest}
                          </p>
                        )}
                        {!item.aiDigest && (
                          <p className="text-xs text-forge-textMuted mb-2">
                            AI paragraph not yet generated: {item.aiDigestError || 'pending'}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-forge-textMuted">
                          {item.publisher && <span>{item.publisher}</span>}
                          {item.date && <span>• {formatDate(item.date)}</span>}
                          <span>• stored {formatDate(item.storedAt || item.retrievalTimestamp)}</span>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-forge-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          Open source ↗
                        </a>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tips Panel */ }
        <div className="bg-gradient-to-br from-forge-surface to-forge-surfaceHigh border border-forge-border rounded-2xl p-6 relative overflow-hidden slide-in mt-6">
          <div className="absolute top-0 right-0 w-24 h-24 bg-forge-ai/10 rounded-full blur-2xl float-animation"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
              <span className="wave-animation">💡</span> TIPS
            </h2>
            <ul className="space-y-2 text-sm text-forge-textMuted">
              <li className="flex items-start gap-2">
                <span className="text-forge-primary">✓</span>
                <span>News Digest fetches real-time stories from live sources, then VUX AI writes a professional paragraph for each one.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-forge-primary">✓</span>
                <span>Every digested item is stored one-by-one so nothing is ever lost — check Digest History.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-forge-primary">✓</span>
                <span>All API keys stay on the backend — nothing is sent to the browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-forge-primary">✓</span>
                <span>Private/loopback URLs are blocked (SSRF protection).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
