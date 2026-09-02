import { useState } from 'react'

export function Studio({ setCurrentPage: _setCurrentPage, username }) {
  const [_activeTab, _setActiveTab] = useState('engine.py')
  const [_terminalOpen, _setTerminalOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState('engine.py')

  const files = [
    { name: 'engine.py', icon: '🐍', modified: true },
    { name: 'renderer.py', icon: '🐍', modified: false },
    { name: 'config.py', icon: '🐍', modified: false },
    { name: 'main.py', icon: '🐍', modified: true },
    { name: 'requirements.txt', icon: '📄', modified: false },
    { name: 'README.md', icon: '📝', modified: false },
  ]

  const aiTabs = ['Chat', 'Current', 'Codebase', 'Docs']

  const codeContent = `import time
from typing import List, Optional

class Engine:
    def __init__(self, fps: int = 60):
        self.fps = fps
        self.running = False
        self.entities: List = []
    
    def add_entity(self, entity):
        self.entities.append(entity)
    
    def remove_entity(self, entity):
        if entity in self.entities:
            self.entities.remove(entity)
    
    def update(self, delta_time: float):
        for entity in self.entities:
            entity.update(delta_time)
    
    def run(self):
        self.running = True
        while self.running:
            start_time = time.time()
            self.update(1.0 / self.fps)
            end_time = time.time()
            elapsed = end_time - start_time
            sleep_time = max(0, (1.0 / self.fps) - elapsed)
            time.sleep(sleep_time)`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Studio Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-forge-border bg-forge-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 lg:gap-4">
          <button 
            onClick={() => setExplorerOpen(!explorerOpen)}
            className="lg:hidden w-8 h-8 rounded-lg bg-forge-surfaceLow border border-forge-border flex items-center justify-center"
          >
            📁
          </button>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-forge-primary text-sm lg:text-base">VUX</span>
            <span className="text-xs text-forge-textMuted hidden sm:inline">AI STUDIO</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <select className="bg-forge-surfaceLow border border-forge-border rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-forge-primary">
              <option>Nebula Engine</option>
              <option>AI Assistant</option>
              <option>Portfolio Site</option>
            </select>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-forge-success"></div>
              <span className="text-xs text-forge-textMuted">main</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 lg:gap-2">
          <button className="px-3 py-2 bg-forge-successLight text-forge-success rounded-lg hover:bg-forge-success/20 transition-all flex items-center gap-2 text-sm">
            <span>▶</span>
            <span className="font-medium hidden sm:inline">Run</span>
          </button>
          <button className="px-3 py-2 bg-forge-warningLight text-forge-warning rounded-lg hover:bg-forge-warning/20 transition-all flex items-center gap-2 text-sm">
            <span>🐛</span>
            <span className="font-medium hidden sm:inline">Debug</span>
          </button>
          <button className="px-3 py-2 bg-forge-techLight text-forge-tech rounded-lg hover:bg-forge-tech/20 transition-all flex items-center gap-2 text-sm">
            <span>👁</span>
            <span className="font-medium hidden sm:inline">Preview</span>
          </button>
          <button className="px-3 py-2 bg-forge-primaryLight text-forge-primary rounded-lg hover:bg-forge-primary/20 transition-all flex items-center gap-2 text-sm">
            <span>🚀</span>
            <span className="font-medium hidden sm:inline">Deploy</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className="w-8 h-8 rounded-lg bg-forge-surfaceLow border border-forge-border flex items-center justify-center hover:bg-forge-surfaceHigh transition-all"
          >
            🤖
          </button>
          <button className="hidden sm:block w-8 h-8 rounded-lg bg-forge-surfaceLow border border-forge-border flex items-center justify-center hover:bg-forge-surfaceHigh transition-all">
            🔍
          </button>
          <button className="hidden sm:block w-8 h-8 rounded-lg bg-forge-surfaceLow border border-forge-border flex items-center justify-center hover:bg-forge-surfaceHigh transition-all">
            📚
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forge-primary to-forge-primaryHover flex items-center justify-center text-white font-bold text-sm">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Explorer - Mobile Drawer */}
        {explorerOpen && (
          <div className="lg:hidden absolute inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setExplorerOpen(false)}></div>
            <div className="absolute left-0 top-0 h-full w-64 bg-forge-surface border-r border-forge-border p-4 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-sm">EXPLORER</h3>
                <button onClick={() => setExplorerOpen(false)} className="w-8 h-8 rounded-lg bg-forge-surfaceHigh flex items-center justify-center">✕</button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1 hover:bg-forge-surfaceLow rounded cursor-pointer">
                  <span>📁</span>
                  <span className="text-sm">src</span>
                </div>
                <div className="pl-4 space-y-1">
                  {files.map((file, index) => (
                    <div 
                      key={index}
                      onClick={() => { setSelectedFile(file.name); setExplorerOpen(false); }}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all ${
                        selectedFile === file.name ? 'bg-forge-primaryLight text-forge-primary' : 'hover:bg-forge-surfaceLow'
                      }`}
                    >
                      <span>{file.icon}</span>
                      <span className="text-sm">{file.name}</span>
                      {file.modified && <span className="text-xs text-forge-warning">M</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explorer - Desktop */}
        <aside className="hidden lg:block w-56 flex-shrink-0 border-r border-forge-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">EXPLORER</h3>
            <div className="flex gap-1">
              <button className="w-6 h-6 rounded bg-forge-surfaceLow flex items-center justify-center text-xs hover:bg-forge-surfaceHigh transition-all">+</button>
              <button className="w-6 h-6 rounded bg-forge-surfaceLow flex items-center justify-center text-xs hover:bg-forge-surfaceHigh transition-all">🔄</button>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 hover:bg-forge-surfaceLow rounded cursor-pointer">
              <span>📁</span>
              <span className="text-sm">src</span>
            </div>
            <div className="pl-4 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-forge-surfaceLow rounded cursor-pointer">
                <span>📁</span>
                <span className="text-sm">core</span>
              </div>
              <div className="pl-4 space-y-1">
                {files.map((file, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedFile(file.name)}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all ${
                      selectedFile === file.name ? 'bg-forge-primaryLight text-forge-primary' : 'hover:bg-forge-surfaceLow'
                    }`}
                  >
                    <span>{file.icon}</span>
                    <span className="text-sm">{file.name}</span>
                    {file.modified && <span className="text-xs text-forge-warning">M</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 hover:bg-forge-surfaceLow rounded cursor-pointer">
              <span>📁</span>
              <span className="text-sm">tests</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 hover:bg-forge-surfaceLow rounded cursor-pointer">
              <span>📄</span>
              <span className="text-sm">requirements.txt</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 hover:bg-forge-surfaceLow rounded cursor-pointer">
              <span>📝</span>
              <span className="text-sm">README.md</span>
            </div>
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Editor Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-forge-border bg-forge-surface overflow-x-auto">
            {files.slice(0, 4).map((file, index) => (
              <button
                key={index}
                onClick={() => setSelectedFile(file.name)}
                className={`flex items-center gap-2 px-3 py-1 rounded-t-lg transition-all whitespace-nowrap ${
                  selectedFile === file.name 
                    ? 'bg-forge-surfaceHigh text-forge-text border-t-2 border-forge-primary' 
                    : 'text-forge-textMuted hover:bg-forge-surfaceLow'
                }`}
              >
                <span className="text-sm">{file.icon}</span>
                <span className="text-sm">{file.name}</span>
                {file.modified && <span className="w-2 h-2 rounded-full bg-forge-warning"></span>}
                <button className="w-4 h-4 rounded hover:bg-forge-border flex items-center justify-center text-xs">×</button>
              </button>
            ))}
          </div>

          {/* Breadcrumb */}
          <div className="px-4 py-2 border-b border-forge-border bg-forge-surfaceLow text-xs text-forge-textMuted">
            src / core / {selectedFile}
          </div>

          {/* Code Editor */}
          <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-forge-surface">
            <pre className="text-forge-text leading-relaxed">
              <code>{codeContent}</code>
            </pre>
          </div>

          {/* Bottom Panel */}
          {terminalOpen && (
            <div className="h-48 border-t border-forge-border flex flex-col">
              <div className="flex items-center gap-4 px-4 py-2 border-b border-forge-border bg-forge-surfaceLow">
                <button className="text-sm font-medium text-forge-primary border-b-2 border-forge-primary pb-1">TERMINAL</button>
                <button className="text-sm text-forge-textMuted hover:text-forge-text">PROBLEMS</button>
                <button className="text-sm text-forge-textMuted hover:text-forge-text">OUTPUT</button>
                <button className="text-sm text-forge-textMuted hover:text-forge-text">DEBUG CONSOLE</button>
                <div className="flex-1"></div>
                <button className="text-xs text-forge-textMuted hover:text-forge-text">+</button>
              </div>
              <div className="flex-1 p-4 font-mono text-xs bg-forge-bg overflow-auto">
                <div className="text-forge-success">$ python main.py</div>
                <div className="text-forge-textMuted">Starting Nebula Engine...</div>
                <div className="text-forge-textMuted">Loading entities...</div>
                <div className="text-forge-success">Engine initialized successfully at 60 FPS</div>
                <div className="text-forge-textMuted mt-2">Ready for input...</div>
              </div>
            </div>
          )}

          {/* Mobile Bottom Toolbar */}
          <div className="lg:hidden flex items-center justify-around border-t border-forge-border py-2 bg-forge-surface">
            <button 
              onClick={() => setExplorerOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-forge-surfaceHigh transition-all"
            >
              <span className="text-lg">📁</span>
              <span className="text-xs">Files</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-forge-surfaceHigh transition-all">
              <span className="text-lg">⌨️</span>
              <span className="text-xs">Terminal</span>
            </button>
            <button 
              onClick={() => setAiPanelOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-forge-surfaceHigh transition-all"
            >
              <span className="text-lg">🤖</span>
              <span className="text-xs">AI</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-forge-surfaceHigh transition-all">
              <span className="text-lg">👁</span>
              <span className="text-xs">Preview</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-forge-successLight text-forge-success hover:bg-forge-success/20 transition-all">
              <span className="text-lg">▶</span>
              <span className="text-xs">Run</span>
            </button>
          </div>
        </main>

        {/* AI Assistant Panel - Desktop */}
        {aiPanelOpen && (
          <aside className="hidden lg:block w-80 flex-shrink-0 border-l border-forge-border flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-forge-border bg-forge-surface">
              <div className="flex items-center gap-2">
                <span className="text-forge-ai">🤖</span>
                <span className="font-display font-semibold text-sm">VUX AI ASSISTANT</span>
              </div>
              <div className="flex-1"></div>
              <button 
                onClick={() => setAiPanelOpen(false)}
                className="text-xs text-forge-primary"
              >
                PRO
              </button>
            </div>

            {/* AI Tabs */}
            <div className="flex items-center gap-1 px-2 py-2 border-b border-forge-border bg-forge-surfaceLow">
              {aiTabs.map((tab, index) => (
                <button
                  key={index}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    index === 0 ? 'bg-forge-aiLight text-forge-ai' : 'text-forge-textMuted hover:text-forge-text'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* AI Chat Area */}
            <div className="flex-1 p-4 overflow-auto space-y-3">
              <div className="bg-forge-surfaceHigh border border-forge-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-forge-ai">🤖 Vux AI</span>
                </div>
                <p className="text-sm text-forge-textMuted">
                  How can I optimize the engine loop for better performance?
                </p>
              </div>
              
              <div className="bg-forge-surface border border-forge-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-forge-tech">💡 Suggestion</span>
                </div>
                <p className="text-sm">
                  Consider implementing entity culling and spatial partitioning for large numbers of entities.
                </p>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs text-forge-primary hover:underline">Apply Changes</button>
                  <button className="text-xs text-forge-textMuted hover:underline">Explain</button>
                </div>
              </div>
            </div>

            {/* AI Input */}
            <div className="p-4 border-t border-forge-border bg-forge-surfaceLow">
              <textarea
                placeholder="Ask Vux AI..."
                className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forge-primary transition-all resize-none"
                rows={2}
              />
            </div>
          </aside>
        )}

        {/* Mobile AI Panel */}
        {aiPanelOpen && (
          <div className="lg:hidden absolute inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAiPanelOpen(false)}></div>
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-forge-surface border-l border-forge-border p-4 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-forge-ai">🤖</span>
                  <span className="font-display font-semibold text-sm">VUX AI ASSISTANT</span>
                </div>
                <button onClick={() => setAiPanelOpen(false)} className="w-8 h-8 rounded-lg bg-forge-surfaceHigh flex items-center justify-center">✕</button>
              </div>
              <div className="bg-forge-surfaceHigh border border-forge-border rounded-lg p-3 mb-3">
                <p className="text-sm text-forge-textMuted">
                  How can I optimize the engine loop for better performance?
                </p>
              </div>
              <textarea
                placeholder="Ask Vux AI..."
                className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forge-primary transition-all resize-none"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between px-4 py-2 border-t border-forge-border bg-forge-surface text-xs text-forge-textMuted">
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-1">
            <span>⎇</span>
            <span className="hidden sm:inline">main</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-forge-success">✓</span>
            <span className="hidden sm:inline">0</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-forge-warning">△</span>
            <span className="hidden sm:inline">0</span>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <span className="hidden sm:inline">Ln 12, Col 8</span>
          <span className="hidden sm:inline">Spaces: 4</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span>Python</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-forge-success"></div>
            <span className="hidden sm:inline">Vux AI Ready</span>
          </div>
        </div>
      </footer>
    </div>
  )
}