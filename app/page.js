'use client'

import { useState, useEffect } from 'react';
import { buildDocumentHTML, exportPDF, exportMarkdown, exportHTML, exportDOCX } from '@/lib/export';

export default function Home() {
  const [theme, setTheme] = useState('dark');
  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState([]);
  const [isUrl, setIsUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Export Options
  const [exportFormat, setExportFormat] = useState('pdf');
  const [pdfTheme, setPdfTheme] = useState('light');
  const [pageSize, setPageSize] = useState('a4');
  const [toc, setToc] = useState(true);
  const [timestamps, setTimestamps] = useState(false);
  const [statsToggle, setStatsToggle] = useState(true);
  
  // Preview Modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Markdown Parser
  const [markedInstance, setMarkedInstance] = useState(null);

  useEffect(() => {
    if (window.marked) {
      setMarkedInstance(window.marked);
    }
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  const handleInput = (e) => {
    const val = e.target.value;
    setInputVal(val);
    setIsUrl(val.trim().startsWith('http'));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputVal(text);
      setIsUrl(text.trim().startsWith('http'));
    } catch {
      // ignore
    }
  };

  const parseText = (text) => {
    const lines = text.split('\\n');
    let msgs = [];
    let currentRole = null;
    let currentName = null;
    let content = [];
    
    const roleRegex = /^(You|ChatGPT|Claude|Gemini|Assistant)\\s*(?:\\n|$)/i;

    lines.forEach(line => {
      const match = line.match(roleRegex);
      if (match) {
        if (currentRole) {
          msgs.push({ role: currentRole, name: currentName, content: content.join('\\n').trim() });
        }
        currentName = match[1];
        currentRole = currentName.toLowerCase() === 'you' ? 'user' : 'assistant';
        content = [];
      } else {
        if (currentRole) content.push(line);
      }
    });
    
    if (currentRole) {
      msgs.push({ role: currentRole, name: currentName, content: content.join('\\n').trim() });
    }
    return msgs;
  };

  const generateDocs = async () => {
    if (!inputVal.trim()) return;
    setError(null);
    setLoading(true);

    let parsed = [];
    if (isUrl) {
      try {
        const res = await fetch(`/api/fetch-chat?url=${encodeURIComponent(inputVal)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        parsed = parseText(data.text);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else {
      parsed = parseText(inputVal);
    }

    if (parsed.length === 0) {
      setError("Could not extract any messages. Make sure the format is correct or the URL is public.");
      setLoading(false);
      return;
    }

    setMessages(parsed);
    setLoading(false);
  };

  const openPreview = () => {
    if (messages.length === 0 || !markedInstance) return;
    const html = buildDocumentHTML(messages, {
      theme: pdfTheme, toc, timestamps, stats: statsToggle
    }, markedInstance);
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const handleDownload = () => {
    if (messages.length === 0 || !markedInstance) return;
    const options = { theme: pdfTheme, toc, timestamps, stats: statsToggle, pageSize };
    const html = buildDocumentHTML(messages, options, markedInstance);
    
    setShowPreview(false);
    
    if (exportFormat === 'pdf') exportPDF(html, options);
    else if (exportFormat === 'markdown') exportMarkdown(messages, options);
    else if (exportFormat === 'docx') exportDOCX(html);
    else exportHTML(html);
  };

  const clearApp = () => {
    setMessages([]);
    setInputVal('');
    setError(null);
  };

  const words = messages.reduce((n, m) => n + m.content.trim().split(/\\s+/).filter(w => w.length > 0).length, 0);

  return (
    <>
      <header className="header" id="top">
        <div className="container header-inner">
          <a href="#" className="logo" id="logo-link">
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2z"/><path d="M14 2v6h6"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            </div>
            <span className="logo-text">ChatExport <span className="logo-accent">Pro</span></span>
          </a>
          <nav className="nav" id="main-nav">
            <a href="#converter" className="nav-link">Convert</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </nav>
          <div className="header-actions">
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" title="Toggle dark/light mode">
              {theme === 'dark' ? (
                <svg className="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg className="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <a href="#converter" className="btn btn-primary btn-sm">Convert Now</a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-bg-grid" aria-hidden="true"></div>
        <div className="hero-orb hero-orb-1" aria-hidden="true"></div>
        <div className="hero-orb hero-orb-2" aria-hidden="true"></div>
        <div className="container hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/></svg>
              Free &bull; No login &bull; Multi-format export
            </div>
            <h1 className="hero-title">Export AI chats to <span className="gradient-text">beautiful documents</span></h1>
            <p className="hero-subtitle">Convert ChatGPT, Claude, Gemini and any AI conversation into stunning PDFs, Word docs, or Markdown. Live preview, custom themes, table of contents — all in your browser.</p>
            <ul className="hero-features">
              <li><span className="check-icon">&#10003;</span> ChatGPT, Claude &amp; Gemini</li>
              <li><span className="check-icon">&#10003;</span> PDF, DOCX &amp; Markdown export</li>
              <li><span className="check-icon">&#10003;</span> Live preview before download</li>
              <li><span className="check-icon">&#10003;</span> Custom themes &amp; fonts</li>
              <li><span className="check-icon">&#10003;</span> Auto table of contents</li>
              <li><span className="check-icon">&#10003;</span> 100% private, browser-only</li>
            </ul>
            <div className="hero-stats">
              <div className="stat-item"><span className="stat-num">5+</span><span className="stat-label">Export formats</span></div>
              <div className="stat-divider"></div>
              <div className="stat-item"><span className="stat-num">0s</span><span className="stat-label">No wait time</span></div>
              <div className="stat-divider"></div>
              <div className="stat-item"><span className="stat-num">&#8734;</span><span className="stat-label">Free conversions</span></div>
            </div>
          </div>

          <div className="converter-card" id="converter">
            <div className="converter-card-inner">

              <label className="input-label" htmlFor="chat-input">Paste chat share link</label>
              <div className="textarea-wrapper">
                <textarea 
                  id="chat-input" 
                  rows="6" 
                  spellCheck="false" 
                  placeholder="https://chatgpt.com/share/..."
                  value={inputVal}
                  onChange={handleInput}
                ></textarea>
                <button className="paste-btn" onClick={handlePaste} title="Paste from clipboard">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M17 4h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1"/></svg>
                  Paste
                </button>
              </div>
              
              {error && <div style={{color: '#ff4d85', fontSize: '0.85rem', marginTop: '8px', marginBottom: '8px'}}>{error}</div>}

              <div className="url-strip" id="url-strip">
                <span id="url-strip-msg">Paste a ChatGPT share link above to instantly convert your conversation.</span>
              </div>
              <div className="options-row">
                <div className="option-group">
                  <label className="option-label" htmlFor="export-format">Format</label>
                  <select id="export-format" className="option-select" value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                    <option value="pdf">PDF</option>
                    <option value="markdown">Markdown (.md)</option>
                    <option value="html">HTML</option>
                    <option value="docx">Word (DOCX)</option>
                  </select>
                </div>
                <div className="option-group">
                  <label className="option-label" htmlFor="pdf-theme">Theme</label>
                  <select id="pdf-theme" className="option-select" value={pdfTheme} onChange={e => setPdfTheme(e.target.value)}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="sepia">Sepia</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div className="option-group">
                  <label className="option-label" htmlFor="page-size">Page size</label>
                  <select id="page-size" className="option-select" value={pageSize} onChange={e => setPageSize(e.target.value)}>
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                  </select>
                </div>
              </div>
              <div className="toggles-row">
                <label className="toggle-label" htmlFor="toggle-toc">
                  <input type="checkbox" id="toggle-toc" className="toggle-input" checked={toc} onChange={e => setToc(e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb"></span></span>
                  <span>Table of contents</span>
                </label>
                <label className="toggle-label" htmlFor="toggle-timestamps">
                  <input type="checkbox" id="toggle-timestamps" className="toggle-input" checked={timestamps} onChange={e => setTimestamps(e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb"></span></span>
                  <span>Timestamps</span>
                </label>
                <label className="toggle-label" htmlFor="toggle-stats">
                  <input type="checkbox" id="toggle-stats" className="toggle-input" checked={statsToggle} onChange={e => setStatsToggle(e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb"></span></span>
                  <span>Chat stats</span>
                </label>
              </div>
              <div className="converter-actions">
                <button className="btn btn-ghost btn-sm" id="preview-btn" disabled={messages.length === 0} onClick={openPreview}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <button className="btn btn-ghost btn-sm" id="clear-btn" onClick={clearApp}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Clear
                </button>
                {messages.length === 0 ? (
                  <button className="btn btn-primary" id="generate-btn" onClick={generateDocs} disabled={loading || !inputVal.trim()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    {loading ? 'Processing...' : 'Generate'}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleDownload}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download {exportFormat.toUpperCase()}
                  </button>
                )}
              </div>
              
              <div className={`stats-bar ${messages.length === 0 ? 'hidden' : ''}`} id="stats-bar">
                <div className="stat-chip" id="stat-messages"><span>{messages.length} messages</span></div>
                <div className="stat-chip" id="stat-words"><span>{words.toLocaleString()} words</span></div>
                <div className="stat-chip" id="stat-tokens"><span>~{Math.round(words * 1.33).toLocaleString()} tokens</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showPreview && (
        <div className="modal-backdrop" id="preview-modal" role="dialog" aria-modal="true" aria-label="Document preview">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Live Preview</span>
              <div className="modal-actions">
                <button className="btn btn-primary btn-sm" id="modal-download-btn" onClick={handleDownload}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </button>
                <button className="modal-close" id="modal-close" aria-label="Close preview" onClick={() => setShowPreview(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div className="modal-body" id="preview-content" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
          </div>
        </div>
      )}

      <section className="section" id="features">
        <div className="container">
          <p className="section-eyebrow">Why choose us</p>
          <h2 className="section-title">Everything the original is missing</h2>
          <p className="section-subtitle">We took the concept and dramatically improved it.</p>
          <div className="features-grid">
            <div className="feature-card feature-card--large">
              <div className="feature-icon feature-icon--purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></div>
              <h3>Live Preview</h3>
              <p>See exactly how your document looks before downloading. Scroll through the full formatted output in a sleek full-screen modal — tweak settings and regenerate instantly.</p>
              <div className="feature-tag">New</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon--blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
              <h3>Multi-format export</h3>
              <p>PDF, Markdown, and HTML — pick what fits your workflow.</p>
              <div className="feature-tag">New</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon--green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg></div>
              <h3>Custom PDF themes</h3>
              <p>Light, Dark, Sepia, or Minimal themes for your exported document.</p>
              <div className="feature-tag">New</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon--orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></div>
              <h3>Table of contents</h3>
              <p>Auto-generated TOC from conversation headings. Navigate long chats instantly.</p>
              <div className="feature-tag">New</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon--pink"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <h3>Multi-AI support</h3>
              <p>ChatGPT, Claude, Gemini, and any raw paste — we detect the format automatically.</p>
              <div className="feature-tag">New</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon--teal"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
              <h3>Chat statistics</h3>
              <p>Word count, message count, and token estimate displayed before you export.</p>
              <div className="feature-tag">New</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon--indigo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
              <h3>Dark / Light mode</h3>
              <p>Full dark mode on the website itself, with smooth animated transition.</p>
              <div className="feature-tag">New</div>
            </div>
            <div className="feature-card feature-card--large">
              <div className="feature-icon feature-icon--purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
              <h3>Beautiful code blocks</h3>
              <p>Monospaced, boxed code sections with language labels. Never clipped at page edges. Long lines wrap gracefully with smart indentation preserved.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <p className="section-eyebrow">Comparison</p>
          <h2 className="section-title">ChatExport Pro vs. the rest</h2>
          <div className="table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="col-us">ChatExport Pro</th>
                  <th>Other converters</th>
                  <th>Browser print</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Live preview</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-no">No</span></td><td><span className="badge-no">No</span></td></tr>
                <tr><td>Markdown / HTML export</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-no">No</span></td><td><span className="badge-no">No</span></td></tr>
                <tr><td>PDF themes (dark, sepia...)</td><td className="col-us"><span className="badge-yes">4 themes</span></td><td><span className="badge-no">No</span></td><td><span className="badge-no">No</span></td></tr>
                <tr><td>Table of contents</td><td className="col-us"><span className="badge-yes">Auto</span></td><td><span className="badge-no">No</span></td><td><span className="badge-no">No</span></td></tr>
                <tr><td>Chat statistics</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-no">No</span></td><td><span className="badge-no">No</span></td></tr>
                <tr><td>Multi-AI (Claude, Gemini)</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-partial">Partial</span></td><td><span className="badge-no">No</span></td></tr>
                <tr><td>Code blocks</td><td className="col-us"><span className="badge-yes">Boxed</span></td><td><span className="badge-yes">Yes</span></td><td><span className="badge-no">Cut off</span></td></tr>
                <tr><td>Tables preserved</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-yes">Yes</span></td><td><span className="badge-no">Squashed</span></td></tr>
                <tr><td>Mobile friendly</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-partial">Varies</span></td><td><span className="badge-no">Poor</span></td></tr>
                <tr><td>No login required</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-yes">Yes</span></td><td><span className="badge-yes">Yes</span></td></tr>
                <tr><td>100% private (browser-only)</td><td className="col-us"><span className="badge-yes">Yes</span></td><td><span className="badge-partial">Varies</span></td><td><span className="badge-yes">Yes</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container">
          <p className="section-eyebrow">Process</p>
          <h2 className="section-title">Three steps. Seconds.</h2>
          <p className="section-subtitle">From chat to polished document faster than you can open a print dialog.</p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
              <h3>Paste link or text</h3>
              <p>Grab your ChatGPT share URL, or copy-paste the full conversation from ChatGPT, Claude, Gemini or any AI tool.</p>
            </div>
            <div className="step-connector" aria-hidden="true"><svg width="40" height="16" viewBox="0 0 40 16" fill="none"><path d="M0 8h32M27 3l10 5-10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
              <h3>Choose your settings</h3>
              <p>Pick PDF, Markdown or HTML. Select a theme. Toggle table of contents, timestamps, and stats on or off.</p>
            </div>
            <div className="step-connector" aria-hidden="true"><svg width="40" height="16" viewBox="0 0 40 16" fill="none"><path d="M0 8h32M27 3l10 5-10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
              <h3>Preview &amp; download</h3>
              <p>Preview the full document in-browser, then download your perfectly formatted file with one click.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <p className="section-eyebrow">Who uses it</p>
          <h2 className="section-title">Built for every kind of AI power user</h2>
          <div className="usecases-grid">
            <div className="usecase-card"><span className="usecase-emoji">&#127891;</span><h3>Students</h3><p>Archive tutoring threads, essay feedback and revision summaries as tidy handouts.</p></div>
            <div className="usecase-card"><span className="usecase-emoji">&#128187;</span><h3>Developers</h3><p>Keep debugging sessions with perfectly formatted code that never gets clipped at page edges.</p></div>
            <div className="usecase-card"><span className="usecase-emoji">&#128300;</span><h3>Researchers</h3><p>Turn sprawling exploratory chats into citable, page-numbered reference documents with auto-TOC.</p></div>
            <div className="usecase-card"><span className="usecase-emoji">&#128188;</span><h3>Consultants</h3><p>Hand clients a polished deliverable instead of a screenshot roll or an expiring share link.</p></div>
            <div className="usecase-card"><span className="usecase-emoji">&#9997;&#65039;</span><h3>Writers</h3><p>Save drafts, outlines and edits offline so nothing depends on a live share URL.</p></div>
            <div className="usecase-card"><span className="usecase-emoji">&#128101;</span><h3>Teams</h3><p>Circulate one consistent format — PDF for delivery or Markdown for collaborative editing.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-eyebrow">Privacy first</p>
          <h2 className="section-title">Your conversations stay yours</h2>
          <div className="privacy-grid">
            <div className="privacy-card"><div className="privacy-icon">&#128274;</div><h3>Nothing stored</h3><p>All processing happens in your browser. No text ever leaves your device. Zero server-side storage.</p></div>
            <div className="privacy-card"><div className="privacy-icon">&#128683;</div><h3>No permissions</h3><p>No clipboard access required, no account, no extension. Just paste and go.</p></div>
            <div className="privacy-card"><div className="privacy-icon">&#128193;</div><h3>You own the file</h3><p>The document is generated entirely in your browser and saved directly to your device.</p></div>
          </div>
        </div>
      </section>

      <section className="section section--alt" id="faq">
        <div className="container">
          <p className="section-eyebrow">Support</p>
          <h2 className="section-title">Frequently asked questions</h2>
          <div className="faq-list">
            <details className="faq-item"><summary className="faq-q">How do I export a ChatGPT conversation to PDF?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">Open the chat, hit Share to get a public URL, paste it in the converter above, choose PDF, and click Generate. The file downloads straight to your device. You can also paste raw conversation text directly.</div></details>
            <details className="faq-item"><summary className="faq-q">Which AI chatbots are supported?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">ChatGPT share links, Claude conversations, Gemini chats, and raw pasted text from any AI chatbot. The tool auto-detects "Human/Assistant", "You/ChatGPT", and similar speaker patterns.</div></details>
            <details className="faq-item"><summary className="faq-q">What export formats are available?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">PDF (with Light, Dark, Sepia, or Minimal themes), Markdown (.md), and HTML. All formats preserve code blocks, tables, lists, and headings.</div></details>
            <details className="faq-item"><summary className="faq-q">Is this free and unlimited?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">Yes — completely free and unlimited. Export as many chats as you like in any format, with no hidden limits.</div></details>
            <details className="faq-item"><summary className="faq-q">Is my conversation data stored anywhere?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">No. All conversion happens locally in your browser. No data is sent to any server. Nothing is stored, logged, or analyzed — ever.</div></details>
            <details className="faq-item"><summary className="faq-q">Does it work on mobile?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">Yes. The site is fully mobile-responsive. You can paste a link and download the PDF from any phone browser without installing anything.</div></details>
            <details className="faq-item"><summary className="faq-q">What is the table of contents feature?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">When enabled, the tool scans your conversation for headings (markdown # H1, ## H2 etc.) and generates a table of contents at the top of the document. Ideal for long research conversations.</div></details>
            <details className="faq-item"><summary className="faq-q">Can I preview before downloading?<span className="faq-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></span></summary><div className="faq-a">Yes! Click the Preview button after pasting your content. A full-screen modal shows the formatted document exactly as it will look in the exported file. You can download directly from the preview.</div></details>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-orb" aria-hidden="true"></div>
        <div className="container cta-inner">
          <h2 className="cta-title">Ready to export your first chat?</h2>
          <p className="cta-sub">No signup. No extension. Just paste and download.</p>
          <a href="#converter" className="btn btn-primary btn-lg">Start converting for free</a>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a href="#" className="logo">
              <div className="logo-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2z"/><path d="M14 2v6h6"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
              <span className="logo-text">ChatExport <span className="logo-accent">Pro</span></span>
            </a>
            <p className="footer-tagline">The most powerful AI chat export tool. Free, private, and built for everyone.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col"><h4>Product</h4><a href="#converter">Convert</a><a href="#features">Features</a><a href="#how-it-works">How it works</a></div>
            <div className="footer-col"><h4>Formats</h4><a href="#converter">PDF</a><a href="#converter">Markdown</a><a href="#converter">HTML</a></div>
            <div className="footer-col"><h4>Info</h4><a href="#faq">FAQ</a><a href="#">Privacy</a><a href="#">Terms</a></div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 ChatExport Pro. Not affiliated with OpenAI, Anthropic, or Google.</p>
        </div>
      </footer>
    </>
  );
}
