import { useEffect, useMemo, useState } from 'react'

const starterFiles = {
  'index.html': '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>New Vux Project</title>\n  </head>\n  <body>\n    <main>\n      <h1>Build something remarkable.</h1>\n      <p>Edit this file, then open Preview.</p>\n    </main>\n  </body>\n</html>',
  'style.css': 'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  background: #0b1326;\n  color: #dae2fd;\n}\nmain { max-width: 42rem; padding: 3rem; }',
}

function fileLanguage(name) {
  if (name.endsWith('.html')) return 'HTML'
  if (name.endsWith('.css')) return 'CSS'
  if (name.endsWith('.js') || name.endsWith('.jsx')) return 'JavaScript'
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'TypeScript'
  if (name.endsWith('.py')) return 'Python'
  return 'Plain Text'
}

function extractCode(text) {
  const match = String(text || '').match(/```(?:[\w#+.-]+)?\s*([\s\S]*?)```/)
  return match ? match[1].trim() : String(text || '').trim()
}

export function Studio({ username }) {
  const [projects, setProjects] = useState([{ name: 'Untitled project', files: starterFiles }])
  const [projectIndex, setProjectIndex] = useState(0)
  const [selectedFile, setSelectedFile] = useState('index.html')
  const [draft, setDraft] = useState(starterFiles['index.html'])
  const [newFileName, setNewFileName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiReply, setAiReply] = useState('')
  const [isAiWorking, setIsAiWorking] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const project = projects[projectIndex]
  const fileNames = Object.keys(project.files)
  const canPreview = selectedFile.endsWith('.html')

  useEffect(() => {
    setDraft(project.files[selectedFile] || '')
  }, [projectIndex, selectedFile, project.files])

  const updateDraft = (value) => {
    setDraft(value)
    setProjects((current) => current.map((item, index) => (
      index === projectIndex ? { ...item, files: { ...item.files, [selectedFile]: value } } : item
    )))
  }

  const createProject = () => {
    const name = projectName.trim() || `Untitled project ${projects.length + 1}`
    setProjects((current) => [...current, { name, files: {} }])
    setProjectIndex(projects.length)
    setSelectedFile('')
    setDraft('')
    setProjectName('')
  }

  const addFile = () => {
    const name = newFileName.trim()
    if (!name || project.files[name] !== undefined) return
    setProjects((current) => current.map((item, index) => (
      index === projectIndex ? { ...item, files: { ...item.files, [name]: '' } } : item
    )))
    setSelectedFile(name)
    setDraft('')
    setNewFileName('')
  }

  const openPreview = () => {
    if (!canPreview) return
    const html = draft.includes('<link') ? draft : draft.replace('</head>', `<style>${project.files['style.css'] || ''}</style></head>`)
    const preview = window.open('', '_blank', 'noopener,noreferrer')
    if (!preview) return
    preview.document.write(html)
    preview.document.close()
    setPreviewOpen(true)
  }

  const askAi = async (event) => {
    event.preventDefault()
    if (!aiPrompt.trim() || isAiWorking) return
    setIsAiWorking(true)
    setAiReply('')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [
          { role: 'user', content: `You are editing ${selectedFile || 'a new file'} in project ${project.name}. Current code:\n\n${draft}\n\nRequest: ${aiPrompt}\nReturn the complete updated file in one code block and no explanation.` },
        ] }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI request failed')
      setAiReply(data.text || '')
      setAiPrompt('')
    } catch (error) {
      setAiReply(`AI error: ${error.message}`)
    } finally {
      setIsAiWorking(false)
    }
  }

  const applyAiReply = () => {
    if (aiReply.startsWith('AI error:')) return
    updateDraft(extractCode(aiReply))
  }

  const projectSummary = useMemo(() => `${fileNames.length} file${fileNames.length === 1 ? '' : 's'}`, [fileNames.length])

  return (
    <div className="min-h-screen flex flex-col bg-forge-bg text-forge-text">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-forge-border bg-forge-surface sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-forge-primary">VUX</span>
          <select value={projectIndex} onChange={(event) => { const next = Number(event.target.value); setProjectIndex(next); setSelectedFile(Object.keys(projects[next].files)[0] || '') }} className="bg-forge-surfaceLow border border-forge-border rounded-lg px-3 py-2 text-sm">
            {projects.map((item, index) => <option key={`${item.name}-${index}`} value={index}>{item.name}</option>)}
          </select>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New project name" className="hidden md:block w-40 bg-forge-surfaceLow border border-forge-border rounded-lg px-3 py-2 text-sm" />
          <button onClick={createProject} className="rounded-lg bg-forge-primary px-3 py-2 text-sm font-semibold text-black">+ Project</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openPreview} disabled={!canPreview} className="rounded-lg bg-forge-techLight px-3 py-2 text-sm text-forge-tech disabled:opacity-40">👁 Preview</button>
          <button onClick={openPreview} disabled={!canPreview} className="rounded-lg bg-forge-successLight px-3 py-2 text-sm text-forge-success disabled:opacity-40">▶ Run</button>
          <span className="text-xs text-forge-textMuted">{username} · {projectSummary}</span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_340px] min-h-[calc(100vh-65px)]">
        <aside className="border-r border-forge-border bg-forge-surface p-4">
          <div className="flex items-center justify-between mb-3"><h2 className="text-xs font-semibold tracking-widest">FILES</h2><span className="text-xs text-forge-textMuted">{projectSummary}</span></div>
          <div className="flex gap-2 mb-4">
            <input value={newFileName} onChange={(event) => setNewFileName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addFile()} placeholder="new-file.html" className="min-w-0 flex-1 bg-forge-surfaceLow border border-forge-border rounded px-2 py-1 text-xs" />
            <button onClick={addFile} className="rounded bg-forge-primary px-2 text-black">+</button>
          </div>
          {fileNames.length === 0 && <p className="text-xs text-forge-textMuted">Empty project. Add a file to begin.</p>}
          {fileNames.map((name) => <button key={name} onClick={() => setSelectedFile(name)} className={`w-full text-left px-2 py-2 rounded text-sm ${selectedFile === name ? 'bg-forge-primaryLight text-forge-primary' : 'hover:bg-forge-surfaceLow'}`}>📄 {name}</button>)}
        </aside>

        <main className="min-w-0 flex flex-col bg-forge-surfaceLow">
          <div className="flex items-center justify-between px-4 py-2 border-b border-forge-border text-xs text-forge-textMuted"><span>{selectedFile || 'No file selected'}</span><span>{fileLanguage(selectedFile)} · Editable</span></div>
          <textarea value={draft} onChange={(event) => updateDraft(event.target.value)} disabled={!selectedFile} spellCheck="false" placeholder="Choose a file or add a new file to start coding..." className="flex-1 min-h-[520px] w-full resize-none bg-[#10182a] p-5 font-mono text-sm leading-6 text-forge-text focus:outline-none focus:ring-1 focus:ring-forge-primary" />
          <div className="flex items-center justify-between border-t border-forge-border px-4 py-2 text-xs text-forge-textMuted"><span>{selectedFile ? `${draft.split('\n').length} lines` : 'No file selected'}</span><span>Changes are kept in this project session</span></div>
        </main>

        <aside className="border-l border-forge-border bg-forge-surface p-4 flex flex-col">
          <div className="mb-3"><h2 className="font-display font-semibold">VUX AI ASSISTANT</h2><p className="text-xs text-forge-textMuted mt-1">Ask for edits, files, or explanations.</p></div>
          <div className="flex-1 overflow-auto rounded-lg border border-forge-border bg-forge-surfaceLow p-3 text-sm whitespace-pre-wrap">{aiReply || 'AI suggestions will appear here. Ask it to update the selected file or create a complete file.'}</div>
          <form onSubmit={askAi} className="mt-3 space-y-2"><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={4} placeholder="Edit this file to..." className="w-full resize-none rounded-lg border border-forge-border bg-forge-surfaceLow px-3 py-2 text-sm focus:outline-none focus:border-forge-primary" /><div className="flex gap-2"><button type="submit" disabled={isAiWorking || !aiPrompt.trim()} className="flex-1 rounded-lg bg-forge-primary px-3 py-2 text-sm font-semibold text-black disabled:opacity-40">{isAiWorking ? 'Thinking...' : 'Ask AI'}</button><button type="button" onClick={applyAiReply} disabled={!aiReply || aiReply.startsWith('AI error:')} className="rounded-lg border border-forge-border px-3 py-2 text-sm disabled:opacity-40">Apply</button></div></form>
          {previewOpen && <p className="mt-3 text-xs text-forge-success">Preview opened in a new browser tab.</p>}
        </aside>
      </div>
    </div>
  )
}
