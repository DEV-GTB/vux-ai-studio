import { useState } from 'react'
import { apiUrl } from '../lib/api.js'

const SUPPORT_GMAIL = 'gtbstudio369@gmail.com'

import { useEffect } from 'react'

export function Help({ setCurrentPage: _setCurrentPage, username }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [feedbackType, setFeedbackType] = useState(null) // 'suggestion' | 'bug'
  const [feedbackText, setFeedbackText] = useState('')
  const [storedFeedback, setStoredFeedback] = useState([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  const loadStoredFeedback = async () => {
    setLoadingFeedback(true)
    try {
      const response = await fetch(apiUrl('/api/feedback'))
      const data = await response.json().catch(() => ({}))
      if (response.ok) setStoredFeedback(data.items || [])
    } catch {
      // best effort
    } finally {
      setLoadingFeedback(false)
    }
  }

  useEffect(() => {
    loadStoredFeedback()
  }, [])

  const categories = [
    { id: 'all', name: 'All Topics', icon: '📚' },
    { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
    { id: 'studio', name: 'Studio', icon: '💻' },
    { id: 'ai', name: 'AI Assistant', icon: '🤖' },
    { id: 'deploy', name: 'Deployment', icon: '🚀' },
    { id: 'account', name: 'Account', icon: '👤' },
  ]

  const helpArticles = [
    { 
      id: 1, 
      title: 'Getting Started with VUX AI', 
      category: 'getting-started',
      excerpt: 'Learn the basics of setting up your first project and using AI assistance.',
      readTime: '5 min',
      popular: true
    },
    { 
      id: 2, 
      title: 'Using the AI Assistant', 
      category: 'ai',
      excerpt: 'Master the AI assistant to write, refactor, and debug code faster.',
      readTime: '8 min',
      popular: true
    },
    { 
      id: 3, 
      title: 'Studio Overview', 
      category: 'studio',
      excerpt: 'Tour the editor, terminal, and AI panel features.',
      readTime: '6 min',
      popular: false
    },
    { 
      id: 4, 
      title: 'Deploying Your Project', 
      category: 'deploy',
      excerpt: 'Deploy your applications to production with one click.',
      readTime: '10 min',
      popular: true
    },
    { 
      id: 5, 
      title: 'Keyboard Shortcuts', 
      category: 'studio',
      excerpt: 'Speed up your workflow with essential keyboard shortcuts.',
      readTime: '4 min',
      popular: false
    },
    { 
      id: 6, 
      title: 'Managing Your Account', 
      category: 'account',
      excerpt: 'Update your profile, manage subscriptions, and security settings.',
      readTime: '7 min',
      popular: false
    },
  ]

  const filteredArticles = selectedCategory === 'all' 
    ? helpArticles.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : helpArticles.filter(a => a.category === selectedCategory && a.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return
    const isBug = feedbackType === 'bug'
    const category = isBug ? 'Bug' : 'Suggestion'
    const subject = `[${isBug ? 'Bug Report' : 'Suggestion'}] ${category} from ${username}`
    const body = [
      `Account Name: ${username}`,
      `Report Category: ${category}`,
      '',
      feedbackText.trim(),
    ].join('\n')

    // Try backend email first (SMTP), fall back to mailto
    try {
      const response = await fetch(apiUrl('/api/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: feedbackType, message: feedbackText.trim(), username }),
      })
      const result = await response.json().catch(() => ({}))
      if (response.ok && result.success) {
        if (result.method === 'smtp') {
          alert('✅ Feedback sent successfully via email!')
          setFeedbackText('')
          setFeedbackType(null)
          return
        }
        // mailto fallback - open user's email client
        window.location.href = result.mailtoUrl
        setFeedbackText('')
        setFeedbackType(null)
        return
      }
    } catch {
      // Backend unreachable, fall through to mailto
    }

    // Final fallback: mailto link
    window.location.href = `mailto:${SUPPORT_GMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setFeedbackText('')
    setFeedbackType(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-forge-border bg-forge-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-lg bg-forge-surfaceLow border border-forge-border flex items-center justify-center">
            ☰
          </button>
          <div>
            <h1 className="text-lg font-display font-semibold">Help Center</h1>
            <p className="text-xs text-forge-textMuted">Documentation and support</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forge-primary to-forge-primaryHover flex items-center justify-center text-white font-bold text-sm">
          {username.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Help Header - Desktop */}
      <header className="hidden lg:block bg-gradient-to-r from-forge-primary/10 to-forge-ai/10 border-b border-forge-border px-8 py-12">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-display font-bold mb-3">How can we help?</h1>
          <p className="text-lg text-forge-textMuted mb-6">Search our documentation, guides, and FAQs</p>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full bg-forge-surface border border-forge-border rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-forge-primary transition-all"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-forge-primary text-black flex items-center justify-center">
              🔍
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search */}
      <div className="lg:hidden p-4 border-b border-forge-border bg-forge-surface">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="w-full bg-forge-surfaceLow border border-forge-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-forge-primary transition-all"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-forge-primary text-black flex items-center justify-center text-sm">
            🔍
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Category Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-forge-border p-4">
          <h3 className="font-display font-semibold mb-4">CATEGORIES</h3>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  selectedCategory === category.id 
                    ? 'bg-forge-primaryLight text-forge-primary' 
                    : 'text-forge-textMuted hover:bg-forge-surfaceLow'
                }`}
              >
                <span>{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Mobile Category Filter */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-forge-border bg-forge-surface overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                selectedCategory === category.id 
                  ? 'bg-forge-primaryLight text-forge-primary' 
                  : 'bg-forge-surfaceLow text-forge-textMuted'
              }`}
            >
              <span className="text-sm">{category.icon}</span>
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {/* Popular Articles */}
          {searchQuery === '' && selectedCategory === 'all' && (
            <div className="mb-8">
              <h2 className="text-xl font-display font-semibold mb-4">Popular Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {helpArticles.filter(a => a.popular).map((article) => (
                  <div key={article.id} className="bg-forge-surface border border-forge-border rounded-xl p-5 hover:border-forge-primary/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-8 h-8 rounded-lg bg-forge-primaryLight flex items-center justify-center text-forge-primary">⚡</span>
                      <span className="text-xs text-forge-primary font-medium">POPULAR</span>
                    </div>
                    <h3 className="font-semibold mb-2">{article.title}</h3>
                    <p className="text-sm text-forge-textMuted mb-3">{article.excerpt}</p>
                    <div className="flex items-center gap-2 text-xs text-forge-textDim">
                      <span>📖 {article.readTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Articles */}
          <div>
            <h2 className="text-xl font-display font-semibold mb-4">
              {searchQuery ? `Search results for "${searchQuery}"` : 
               selectedCategory === 'all' ? 'All Articles' : 
               categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <div className="space-y-3">
              {filteredArticles.length > 0 ? filteredArticles.map((article) => (
                <div key={article.id} className="bg-forge-surface border border-forge-border rounded-xl p-5 hover:border-forge-primary/50 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{article.title}</h3>
                      <p className="text-sm text-forge-textMuted mb-3">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-forge-textDim">
                        <span>📖 {article.readTime}</span>
                        <span>📁 {categories.find(c => c.id === article.category)?.name}</span>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg bg-forge-surfaceLow border border-forge-border flex items-center justify-center hover:bg-forge-surfaceHigh transition-all flex-shrink-0">
                      →
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-forge-textMuted">Try adjusting your search or filter</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback / Bug Report: sends by email to the support Gmail. No backend or database needed. */}
          <div className="mt-10 border-t border-forge-border pt-8">
            <h2 className="text-xl font-display font-semibold mb-2">Send Feedback or Report a Bug</h2>
            <p className="text-sm text-forge-textMuted mb-4">
              Tell us what is wrong or what should improve. Submitting opens your email app addressed to{' '}
              <span className="text-forge-primary font-medium">{SUPPORT_GMAIL}</span> with your account name and
              report category included.
            </p>
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => { setFeedbackType('suggestion'); setFeedbackText(''); }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  feedbackType === 'suggestion'
                    ? 'bg-forge-primaryLight border-forge-primary text-forge-primary'
                    : 'bg-forge-surface border-forge-border text-forge-textMuted hover:bg-forge-surfaceLow'
                }`}
              >
                💡 Suggestion
              </button>
              <button
                type="button"
                onClick={() => { setFeedbackType('bug'); setFeedbackText(''); }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  feedbackType === 'bug'
                    ? 'bg-forge-primaryLight border-forge-primary text-forge-primary'
                    : 'bg-forge-surface border-forge-border text-forge-textMuted hover:bg-forge-surfaceLow'
                }`}
              >
                🐛 Bug Report
              </button>
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={feedbackType === 'bug' ? 'Describe the bug and what happened...' : 'Describe your suggestion...'}
              rows={4}
              className="w-full bg-forge-surface border border-forge-border rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-forge-primary transition-all"
            />
            <button
              type="button"
              onClick={submitFeedback}
              disabled={!feedbackText.trim()}
              className="w-full px-4 py-3 bg-forge-primary text-black font-medium rounded-lg hover:bg-forge-primaryHover transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {feedbackType === 'bug' ? '📩 Send Bug Report' : '📩 Send Suggestion'}
            </button>
          </div>

          {/* Previously submitted feedback — stored locally, no email needed */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-semibold">Submitted Reports</h3>
              <button
                type="button"
                onClick={loadStoredFeedback}
                disabled={loadingFeedback}
                className="text-xs px-3 py-1.5 bg-forge-surfaceLow border border-forge-border rounded-lg hover:bg-forge-surfaceHigh transition-all"
              >
                {loadingFeedback ? '⏳' : '🔄 Refresh'}
              </button>
            </div>
            {loadingFeedback && storedFeedback.length === 0 && (
              <p className="text-sm text-forge-textMuted italic">Loading...</p>
            )}
            {!loadingFeedback && storedFeedback.length === 0 && (
              <p className="text-sm text-forge-textMuted">No reports submitted yet.</p>
            )}
            {storedFeedback.map((item) => (
              <div key={item.id} className="bg-forge-surface border border-forge-border rounded-xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${item.type === 'bug' ? 'bg-red-500/10 text-red-400' : 'bg-forge-primaryLight text-forge-primary'}`}>
                    {item.type === 'bug' ? '🐛 Bug' : '💡 Suggestion'}
                  </span>
                  <span className="text-xs text-forge-textMuted">{new Date(item.date).toLocaleString()}</span>
                  {item.emailSent && <span className="text-xs text-green-400">✉️ Email sent</span>}
                </div>
                <p className="text-sm font-medium text-white mb-1">{item.username}</p>
                <p className="text-sm text-forge-textMuted whitespace-pre-wrap">{item.message}</p>
              </div>
            ))}
          </div>
        </main>

        {/* Quick Links Sidebar - Desktop */}
        <aside className="hidden lg:block w-80 flex-shrink-0 border-l border-forge-border p-4 space-y-4">
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <h3 className="font-display font-semibold mb-3">QUICK LINKS</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-forge-surfaceLow transition-all text-left">
                <span>📖</span>
                <span className="text-sm">Documentation</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-forge-surfaceLow transition-all text-left">
                <span>🎓</span>
                <span className="text-sm">Tutorials</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-forge-surfaceLow transition-all text-left">
                <span>💬</span>
                <span className="text-sm">Community</span>
              </button>
              <button
                onClick={() => { setFeedbackType('bug'); setFeedbackText(''); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-forge-surfaceLow transition-all text-left"
              >
                <span>🐛</span>
                <span className="text-sm">Report Bug</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-forge-primary/20 to-forge-ai/20 border border-forge-primary/30 rounded-xl p-4">
            <h3 className="font-display font-semibold mb-2">Still need help?</h3>
            <p className="text-sm text-forge-textMuted mb-4">
              Our support team is available 24/7 to assist you.
            </p>
            <button
              onClick={() => { setFeedbackType('suggestion'); setFeedbackText(''); }}
              className="w-full px-4 py-2 bg-forge-primary text-black font-medium rounded-lg hover:bg-forge-primaryHover transition-all text-sm"
            >
              Contact Support
            </button>
          </div>

          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <h3 className="font-display font-semibold mb-3">RECENTLY VIEWED</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-forge-surfaceLow transition-all">
                <div className="text-sm font-medium">Getting Started</div>
                <div className="text-xs text-forge-textDim">Viewed 2 hours ago</div>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-forge-surfaceLow transition-all">
                <div className="text-sm font-medium">Deploying Projects</div>
                <div className="text-xs text-forge-textDim">Viewed yesterday</div>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Contact Support */}
      <div className="lg:hidden p-4 border-t border-forge-border bg-forge-surface">
        <button className="w-full px-4 py-3 bg-forge-primary text-black font-medium rounded-lg hover:bg-forge-primaryHover transition-all text-sm">
          Contact Support
        </button>
      </div>
    </div>
  )
}