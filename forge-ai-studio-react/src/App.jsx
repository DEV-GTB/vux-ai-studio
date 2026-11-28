import { useState, useEffect, lazy, Suspense } from 'react'
import { Landing, Home, HomeController, Chat, Settings, Help, Username, Terms } from './pages'
import { Logo } from './components/Logo'
import AuthPage from './components/AuthPage'
import './index.css'
import "./components/auth.css"

// Heavy workspaces (code editor + WebGL) are loaded on demand so the initial
// page stays light and fast.
const Studio = lazy(() => import('./pages/Studio.jsx').then((module) => ({ default: module.Studio })))
const Image = lazy(() => import('./pages/Image.jsx').then((module) => ({ default: module.Image })))
const Object3D = lazy(() => import('./pages/Object3D.jsx').then((module) => ({ default: module.Object3D })))
const Vision = lazy(() => import('./features/live-app-vision/VisionWorkspace.jsx').then((module) => ({ default: module.VisionWorkspace })))

function PageLoader() {
  const tips = [
    "💡 Tip: Use Ctrl+K to quickly search across all workspaces",
    "🎨 Pro tip: Try different aspect ratios for unique image compositions",
    "⚡ VUX AI can generate code, images, 3D objects, and more!",
    "🚀 Tip: Save your favorite prompts for quick reuse",
    "💬 Chat with VUX AI to brainstorm your next big idea",
    "🔍 Use the search bar to find anything in your projects",
    "✨ Did you know? VUX AI supports multiple AI providers",
    "🎯 Pro tip: Organize your projects with folders and tags",
  ]
  const [tipIndex, setTipIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-forge-bg text-forge-text">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
        <img src="/vux-logo.png" alt="VUX AI" className="h-16 w-16 animate-pulse" style={{ objectFit: 'contain' }} />
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-forge-textMuted">Loading workspace…</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-forge-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-forge-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-forge-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <p className="text-xs text-forge-textDim animate-fade-in">{tips[tipIndex]}</p>
      </div>
    </div>
  )
}

const PAGE_PATHS = {
  landing: '/',
  home: '/home',
  'home-controller': '/home-controller',
  chat: '/chat',
  studio: '/studio',
  image: '/image-generator',
  object3d: '/3d-object-generator',
  vision: '/live-app-vision',
  settings: '/settings',
  help: '/help',
  username: '/login',
  terms: '/terms',
  auth: '/auth',
  'auth-callback': '/auth/callback',
}

const PATH_PAGES = {
  '/home': 'home',
  '/home-controller': 'home-controller',
  '/chat': 'chat',
  '/studio': 'studio',
  '/image-generator': 'image',
  '/image': 'image',
  '/3d-object-generator': 'object3d',
  '/object3d': 'object3d',
  '/live-app-vision': 'vision',
  '/vision': 'vision',
  '/settings': 'settings',
  '/help': 'help',
  '/login': 'username',
  '/terms': 'terms',
  '/auth': 'auth',
  '/auth/callback': 'auth-callback',
}

function pageFromPath(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '').toLowerCase() || '/'
  return PATH_PAGES[normalizedPath] || null
}

function App() {
  const [currentPage, setCurrentPageState] = useState(() => {
    const pathPage = pageFromPath(window.location.pathname)
    if (pathPage) return pathPage
    return localStorage.getItem('vux_onboarded') ? 'home' : 'landing'
  })
  const [username, _setUsername] = useState(localStorage.getItem('vux_username') || 'Developer')
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('vux_onboarded')
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('vux_theme') || 'dark')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const setCurrentPage = (page) => {
    setCurrentPageState(page)
    const path = PAGE_PATHS[page]
    if (path && window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
  }

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
    localStorage.setItem('vux_theme', theme)
  }, [theme])

  useEffect(() => {
    const handlePopState = () => {
      const pathPage = pageFromPath(window.location.pathname)
      setCurrentPageState(pathPage || (isAuthenticated ? 'home' : 'landing'))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isAuthenticated])

  const handleGetStarted = () => {
    setCurrentPage('auth')
  }

  const handleTerms = () => {
    setCurrentPage('terms')
  }

  const handleUsernameContinue = (value, vibe) => {
    _setUsername(value)
    localStorage.setItem('vux_username', value)
    localStorage.setItem('vux_vibe', vibe)
    setIsAuthenticated(true)
    setCurrentPage('home')
    localStorage.setItem('vux_onboarded', 'true')
  }

  const renderPage = () => {
    if (!isAuthenticated) {
      if (currentPage === 'username') return <Username onContinue={handleUsernameContinue} />
      if (currentPage === 'terms') return <Terms onBack={() => setCurrentPage('landing')} />
      if (currentPage === 'auth') return <AuthPage />
      if (currentPage === 'auth-callback') {
        // Handle OAuth callback - extract token from URL hash
        const hash = window.location.hash
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1))
          const token = params.get('access_token')
          if (token) {
            localStorage.setItem('vux_supabase_token', token)
            localStorage.setItem('vux_onboarded', 'true')
            setIsAuthenticated(true)
            setCurrentPage('home')
            return null
          }
        }
        return <AuthPage />
      }
      return <Landing onGetStarted={handleGetStarted} onTerms={handleTerms} />
    }

    switch(currentPage) {
      case 'home': return <Home setCurrentPage={setCurrentPage} username={username} />
      case 'home-controller': return <HomeController setCurrentPage={setCurrentPage} />
      case 'chat': return <Chat setCurrentPage={setCurrentPage} username={username} />
      case 'studio': return <Studio username={username} />
      case 'image': return <Image setCurrentPage={setCurrentPage} username={username} />
      case 'object3d': return <Object3D setCurrentPage={setCurrentPage} username={username} />
      case 'vision': return <Vision setCurrentPage={setCurrentPage} username={username} />
      case 'settings': return <Settings setCurrentPage={setCurrentPage} username={username} />
      case 'help': return <Help setCurrentPage={setCurrentPage} username={username} />
      case 'terms': return <Terms onBack={() => setCurrentPage('home')} />
      case 'auth': return <AuthPage />
      case 'auth-callback': return <AuthPage />
      default: return <Home setCurrentPage={setCurrentPage} username={username} />
    }
  }

  if (!isAuthenticated) return renderPage()

  return (
    <div className="flex min-h-screen bg-forge-bg text-forge-text">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:sticky lg:top-0 lg:h-screen z-50 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${
          mobileMenuOpen ? 'h-screen' : 'lg:h-screen'
        } bg-forge-surface border-r border-forge-border`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 border-b border-forge-border ${sidebarCollapsed ? 'justify-center p-4' : 'p-6'}`}>
          <Logo className="h-8 w-8 flex-shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-forge-primary tracking-tight">VUX</span>
              <span className="text-xs text-forge-textMuted">AI STUDIO</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto p-4">
          <button
            onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'home' 
                ? 'bg-forge-primaryLight text-forge-primary border-l-2 border-forge-primary' 
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Home"
          >
            <span className="text-xl flex-shrink-0">🏠</span>
            {!sidebarCollapsed && <span className="font-medium">Home</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('chat'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'chat' 
                ? 'bg-forge-aiLight text-forge-ai border-l-2 border-forge-ai' 
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Chat"
          >
            <span className="text-xl flex-shrink-0">💬</span>
            {!sidebarCollapsed && <span className="font-medium">Chat</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('home-controller'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'home-controller'
                ? 'bg-forge-techLight text-forge-tech border-l-2 border-forge-tech'
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Home Controller"
          >
            <span className="text-xl flex-shrink-0">⌁</span>
            {!sidebarCollapsed && <span className="font-medium">Home Controller</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('studio'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'studio' 
                ? 'bg-forge-techLight text-forge-tech border-l-2 border-forge-tech' 
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Studio"
          >
            <span className="text-xl flex-shrink-0">💻</span>
            {!sidebarCollapsed && <span className="font-medium">Studio</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('image'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'image' 
                ? 'bg-forge-primaryLight text-forge-primary border-l-2 border-forge-primary' 
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Image Generator"
          >
            <span className="text-xl flex-shrink-0">🎨</span>
            {!sidebarCollapsed && <span className="font-medium">Image</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('object3d'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'object3d' 
                ? 'bg-forge-techLight text-forge-tech border-l-2 border-forge-tech' 
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="3D Objects"
          >
            <span className="text-xl flex-shrink-0">🎲</span>
            {!sidebarCollapsed && <span className="font-medium">3D Object</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('vision'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'vision'
                ? 'bg-forge-techLight text-forge-tech border-l-2 border-forge-tech'
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Live App Vision"
          >
            <span className="text-xl flex-shrink-0">📸</span>
            {!sidebarCollapsed && <span className="font-medium">Live App Vision</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('settings'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'settings' 
                ? 'bg-forge-surfaceHigh text-forge-text border-l-2 border-forge-borderActive' 
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Settings"
          >
            <span className="text-xl flex-shrink-0">⚙️</span>
            {!sidebarCollapsed && <span className="font-medium">Settings</span>}
          </button>
          <button
            onClick={() => { setCurrentPage('help'); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === 'help' 
                ? 'bg-forge-surfaceHigh text-forge-text border-l-2 border-forge-borderActive' 
                : 'text-forge-textMuted hover:bg-forge-surfaceLow'
            }`}
            title="Help"
          >
            <span className="text-xl flex-shrink-0">❓</span>
            {!sidebarCollapsed && <span className="font-medium">Help</span>}
          </button>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-forge-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-forge-surfaceLow transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-forge-primary to-forge-primaryHover flex items-center justify-center text-white font-bold flex-shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{username}</div>
                <div className="text-xs text-forge-textMuted">Developer</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full mt-2 px-4 py-2 text-xs text-forge-textMuted hover:text-forge-text hover:bg-forge-surfaceLow rounded-lg transition-all"
          >
            {sidebarCollapsed ? '→' : '← Collapse'}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full mt-2 px-4 py-2 text-xs text-forge-textMuted hover:text-forge-text hover:bg-forge-surfaceLow rounded-lg transition-all"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 w-10 h-10 rounded-lg bg-forge-surface border border-forge-border flex items-center justify-center"
      >
        ☰
      </button>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-hidden lg:ml-0">
        <div key={currentPage} className="page-enter h-full min-w-0">
          <Suspense fallback={<PageLoader />}>{renderPage()}</Suspense>
        </div>
      </main>
    </div>
  )
}

export default App