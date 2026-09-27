const fs = require("fs");
const path = require("path");
const dir = "d:/Projects/GPTtoPDF";

// Read bookmarklet
const bm = fs.readFileSync(path.join(dir, "bookmarklet.txt"), "utf8");

const appJS = `/* ============================================================
   ChatExport Pro — app.js
   ============================================================ */
"use strict";

// ── Bookmarklet injection ──────────────────────────────────
const BOOKMARKLET_CODE = ${JSON.stringify(bm)};

// Set the bookmarklet href on the draggable link
document.addEventListener("DOMContentLoaded", () => {
  const bmLink = document.getElementById("bookmarklet-link");
  if (bmLink) bmLink.href = BOOKMARKLET_CODE;
});
// Also set it immediately in case DOM already loaded
(function() {
  const bmLink = document.getElementById("bookmarklet-link");
  if (bmLink) bmLink.href = BOOKMARKLET_CODE;
})();

// ── State ──────────────────────────────────────────────────
const state = {
  rawInput: "",
  parsedMessages: [],
  activeAI: "chatgpt",
  lastGeneratedHTML: "",
};

// ── DOM refs ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const themeToggle    = $("theme-toggle");
const chatInput      = $("chat-input");
const pasteBtn       = $("paste-btn");
const generateBtn    = $("generate-btn");
const previewBtn     = $("preview-btn");
const clearBtn       = $("clear-btn");
const exportFormat   = $("export-format");
const pdfTheme       = $("pdf-theme");
const pageSize       = $("page-size");
const toggleTOC      = $("toggle-toc");
const toggleTS       = $("toggle-timestamps");
const toggleStats    = $("toggle-stats");
const statsBar       = $("stats-bar");
const statMessages   = $("stat-messages");
const statWords      = $("stat-words");
const statTokens     = $("stat-tokens");
const progressWrap   = $("progress-wrap");
const progressBar    = $("progress-bar");
const progressLabel  = $("progress-label");
const previewModal   = $("preview-modal");
const previewContent = $("preview-content");
const modalClose     = $("modal-close");
const modalDownload  = $("modal-download-btn");
const urlStrip       = $("url-strip");
const urlStripMsg    = $("url-strip-msg");

// ── Theme toggle ───────────────────────────────────────────
let currentTheme = localStorage.getItem("cep-theme") || "dark";
document.documentElement.setAttribute("data-theme", currentTheme);

themeToggle.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("cep-theme", currentTheme);
});

// ── AI tab switching ───────────────────────────────────────
document.querySelectorAll(".ai-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".ai-tab").forEach(t => {
      t.classList.remove("active");
    });
    tab.classList.add("active");
    state.activeAI = tab.dataset.ai;
    updatePlaceholder();
  });
});

function updatePlaceholder() {
  const map = {
    chatgpt: "You: Hello\\nChatGPT: Hi! How can I help?\\n\\nOr use the bookmarklet below to auto-extract...",
    claude:  "Human: Hello\\nAssistant: Hi! How can I help you today?",
    gemini:  "You: Hello\\nGemini: Hello! How can I help?",
    other:   "Paste any AI conversation text here — speaker format is auto-detected",
  };
  chatInput.placeholder = map[state.activeAI] || map.other;
}

// ── Paste button ───────────────────────────────────────────
pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    chatInput.value = text;
    chatInput.dispatchEvent(new Event("input"));
    pasteBtn.innerHTML = "&#10003; Pasted!";
    setTimeout(() => {
      pasteBtn.innerHTML = \`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M17 4h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1"/></svg> Paste\`;
    }, 1800);
  } catch {
    // Clipboard API unavailable (common on file:// origins)
    chatInput.focus();
    chatInput.select();
    alert("Press Ctrl+V (or Cmd+V on Mac) to paste.");
  }
});

// ── URL detection ──────────────────────────────────────────
function isURL(text) {
  return /^https?:\\/\\//i.test(text.trim());
}

// ── Live stats on input ────────────────────────────────────
chatInput.addEventListener("input", () => {
  const val = chatInput.value.trim();
  state.rawInput = val;

  if (isURL(val)) {
    // Show URL warning strip
    urlStrip.classList.add("url-strip--warn");
    urlStripMsg.innerHTML = \`<strong>URL detected.</strong> Direct URL fetching is blocked by browsers due to CORS. 
      <a href="#bookmarklet" class="url-strip-link">Use the bookmarklet</a> to extract the conversation, then paste the text here.\`;
    statsBar.classList.add("hidden");
    previewBtn.disabled = true;
    return;
  }

  // Reset URL strip
  urlStrip.classList.remove("url-strip--warn");
  urlStripMsg.innerHTML = \`Paste conversation text above, or <a href="#bookmarklet" class="url-strip-link">use the bookmarklet</a> to extract from ChatGPT automatically.\`;

  if (val.length > 20) {
    const msgs  = parseTextConversation(val);
    state.parsedMessages = msgs;
    const words  = countWords(val);
    const tokens = Math.round(words * 1.33);
    statMessages.querySelector("span").textContent = msgs.length + " message" + (msgs.length !== 1 ? "s" : "");
    statWords.querySelector("span").textContent    = words.toLocaleString() + " words";
    statTokens.querySelector("span").textContent   = "~" + tokens.toLocaleString() + " tokens";
    statsBar.classList.remove("hidden");
    previewBtn.disabled = false;
  } else {
    statsBar.classList.add("hidden");
    previewBtn.disabled = true;
  }
});

// ── Parse raw pasted conversation text ────────────────────
function parseTextConversation(text) {
  const messages = [];
  const lines = text.split("\\n");
  let current = null;

  for (const line of lines) {
    const match = line.match(/^(You|Human|User|ChatGPT|Assistant|AI|Claude|Gemini|Bard|GPT(?:-\\d+)?|Me|Copilot)\\s*:/i);
    if (match) {
      if (current) messages.push(current);
      const speaker = match[1];
      const isUser  = /^(You|Human|User|Me)$/i.test(speaker);
      current = {
        role:      isUser ? "user" : "ai",
        name:      isUser ? "You" : speaker,
        content:   line.slice(match[0].length).trimStart(),
        timestamp: null,
      };
    } else if (current) {
      current.content += (current.content ? "\\n" : "") + line;
    } else {
      if (!current) {
        current = { role: "ai", name: "AI", content: line, timestamp: null };
      }
    }
  }
  if (current) messages.push(current);

  if (messages.length === 0) {
    messages.push({ role: "ai", name: "AI", content: text, timestamp: null });
  }

  return messages
    .map(m => ({ ...m, content: m.content.trim() }))
    .filter(m => m.content.length > 0);
}

function countWords(text) {
  return text.trim().split(/\\s+/).filter(w => w.length > 0).length;
}

// ── Clear ──────────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  chatInput.value = "";
  state.rawInput = "";
  state.parsedMessages = [];
  statsBar.classList.add("hidden");
  progressWrap.classList.add("hidden");
  previewBtn.disabled = true;
  urlStrip.classList.remove("url-strip--warn");
  urlStripMsg.innerHTML = \`Paste conversation text above, or <a href="#bookmarklet" class="url-strip-link">use the bookmarklet</a> to extract from ChatGPT automatically.\`;
});

// ── Smooth-scroll anchors ──────────────────────────────────
document.querySelectorAll("a[href^='#']").forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth" }); }
  });
});

// ── Build document HTML ────────────────────────────────────
function buildDocumentHTML(messages, options) {
  const theme     = options.theme || "light";
  const wantTOC   = options.toc;
  const wantStats = options.stats;
  const wantTS    = options.timestamps;
  const now       = new Date().toLocaleString();
  const wordCount = messages.reduce((n, m) => n + countWords(m.content), 0);
  const tokens    = Math.round(wordCount * 1.33);

  const headings = [];
  if (wantTOC) {
    messages.forEach(msg => {
      msg.content.split("\\n").forEach(line => {
        const hm = line.match(/^(#{1,3})\\s+(.+)/);
        if (hm) headings.push({ level: hm[1].length, text: hm[2] });
      });
    });
  }

  let html = "";

  html += \`<div class="doc-header">
    <div class="doc-title">AI Conversation Export</div>
    <div class="doc-meta">Generated by ChatExport Pro &bull; \${now} &bull; \${messages.length} messages &bull; \${wordCount.toLocaleString()} words</div>
  </div>\`;

  if (wantStats) {
    html += \`<div class="stats-panel">
      <span>Messages: <strong>\${messages.length}</strong></span>
      <span>Words: <strong>\${wordCount.toLocaleString()}</strong></span>
      <span>Est. tokens: <strong>~\${tokens.toLocaleString()}</strong></span>
      <span>Exported: <strong>\${now}</strong></span>
    </div>\`;
  }

  if (wantTOC && headings.length > 0) {
    html += \`<div class="toc"><h2>Table of Contents</h2><ol>\`;
    headings.forEach((h, i) => {
      html += \`<li style="margin-left:\${(h.level - 1) * 16}px"><a href="#heading-\${i}">\${escapeHTML(h.text)}</a></li>\`;
    });
    html += \`</ol></div>\`;
  }

  let hIdx = 0;
  messages.forEach((msg, mi) => {
    if (msg.role === "system") {
      html += \`<div class="msg-block system-msg"><div class="msg-body"><p><em>\${escapeHTML(msg.content)}</em></p></div></div>\`;
      return;
    }
    const avatarClass = msg.role === "user" ? "user" : "ai";
    const avatarLabel = msg.role === "user" ? "YOU" : "AI";
    const ts = (wantTS && msg.timestamp) ? \`<span class="msg-time">\${msg.timestamp}</span>\` : "";
    let content = msg.content;
    if (wantTOC) {
      content = content.replace(/^(#{1,3})\\s+(.+)/gm, (_, hashes, text) => {
        const id = \`heading-\${hIdx++}\`;
        return \`\${hashes} <span id="\${id}">\${text}</span>\`;
      });
    }
    let bodyHTML = "";
    try { bodyHTML = marked.parse(content, { breaks: true, gfm: true }); }
    catch { bodyHTML = \`<p>\${escapeHTML(content).replace(/\\n/g, "<br>")}</p>\`; }
    if (mi > 0) html += \`<hr class="msg-divider">\`;
    html += \`<div class="msg-block" id="msg-\${mi}">
      <div class="msg-header">
        <div class="msg-avatar \${avatarClass}">\${avatarLabel}</div>
        <span class="msg-name">\${escapeHTML(msg.name)}</span>
        \${ts}
      </div>
      <div class="msg-body">\${bodyHTML}</div>
    </div>\`;
  });

  return \`<div class="preview-doc theme-\${theme}">\${html}</div>\`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Progress helpers ───────────────────────────────────────
function showProgress(label, pct) {
  progressWrap.classList.remove("hidden");
  progressBar.style.width = Math.min(pct, 100) + "%";
  progressBar.style.background = "";
  progressLabel.textContent = label;
}
function hideProgress() {
  setTimeout(() => {
    progressWrap.classList.add("hidden");
    progressBar.style.width = "0%";
  }, 400);
}
function showError(msg) {
  progressWrap.classList.remove("hidden");
  progressLabel.textContent = "&#9888; " + msg;
  progressBar.style.width = "100%";
  progressBar.style.background = "linear-gradient(90deg, #f87171, #ef4444)";
  setTimeout(() => {
    progressWrap.classList.add("hidden");
    progressBar.style.background = "";
    progressBar.style.width = "0%";
  }, 9000);
}

// ── Generate ───────────────────────────────────────────────
generateBtn.addEventListener("click", async () => {
  const raw = chatInput.value.trim();
  if (!raw) {
    chatInput.focus();
    chatInput.style.borderColor = "#f87171";
    setTimeout(() => { chatInput.style.borderColor = ""; }, 1500);
    return;
  }

  if (isURL(raw)) {
    // Show clear guidance instead of trying to fetch
    showError("URLs cannot be fetched directly from the browser. Please use the bookmarklet or paste the conversation text.");
    document.getElementById("bookmarklet").scrollIntoView({ behavior: "smooth" });
    return;
  }

  generateBtn.disabled = true;
  generateBtn.innerHTML = "<span class='spinner'></span> Working\u2026";

  try {
    showProgress("Parsing conversation\u2026", 30);
    await delay(100);

    const messages = parseTextConversation(raw);
    state.parsedMessages = messages;

    if (!messages || messages.length === 0) {
      throw new Error("No conversation content found.");
    }

    const options = {
      theme:      pdfTheme.value,
      toc:        toggleTOC.checked,
      timestamps: toggleTS.checked,
      stats:      toggleStats.checked,
      pageSize:   pageSize.value,
    };

    showProgress("Building document\u2026", 60);
    await delay(100);
    const docHTML = buildDocumentHTML(messages, options);
    state.lastGeneratedHTML = docHTML;

    showProgress("Generating file\u2026", 85);
    await delay(80);

    const format = exportFormat.value;
    if (format === "pdf")           await exportPDF(docHTML, options);
    else if (format === "markdown") exportMarkdown(messages, options);
    else                            exportHTML(docHTML);

    showProgress("Done! File downloaded.", 100);
    hideProgress();

  } catch (err) {
    console.error(err);
    showError(err.message || "Unknown error occurred.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = \`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Generate\`;
  }
});

// ── Preview ────────────────────────────────────────────────
previewBtn.addEventListener("click", () => {
  const raw = chatInput.value.trim();
  if (!raw || isURL(raw)) return;
  const messages = parseTextConversation(raw);
  const options = { theme: pdfTheme.value, toc: toggleTOC.checked, timestamps: toggleTS.checked, stats: toggleStats.checked };
  const docHTML = buildDocumentHTML(messages, options);
  state.lastGeneratedHTML = docHTML;
  state.parsedMessages = messages;
  previewContent.innerHTML = getPreviewStyles() + docHTML;
  previewModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
});

modalClose.addEventListener("click", closeModal);
previewModal.addEventListener("click", e => { if (e.target === previewModal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

function closeModal() {
  previewModal.classList.add("hidden");
  document.body.style.overflow = "";
}

modalDownload.addEventListener("click", () => {
  closeModal();
  const msgs = state.parsedMessages;
  if (!msgs || !msgs.length) return;
  const opts = { theme: pdfTheme.value, toc: toggleTOC.checked, timestamps: toggleTS.checked, stats: toggleStats.checked, pageSize: pageSize.value };
  const html = buildDocumentHTML(msgs, opts);
  if (exportFormat.value === "pdf")          exportPDF(html, opts);
  else if (exportFormat.value === "markdown") exportMarkdown(msgs, opts);
  else                                        exportHTML(html);
});

// ── Preview styles (inline for exports) ───────────────────
function getPreviewStyles() {
  return \`<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    .preview-doc{font-family:'Inter',sans-serif;max-width:760px;margin:0 auto;font-size:14px;line-height:1.7;color:#1a1a2e}
    .preview-doc.theme-dark{background:#1a1a2e;color:#e8e8f0;padding:20px;border-radius:12px}
    .preview-doc.theme-sepia{background:#f5f0e8;color:#3c3225;padding:20px;border-radius:12px}
    .preview-doc.theme-minimal{background:#fff;color:#111}
    .preview-doc.theme-light{background:#fff;color:#1a1a2e}
    .doc-header{border-bottom:2px solid #6c63ff;padding-bottom:16px;margin-bottom:24px}
    .doc-title{font-size:1.4rem;font-weight:700;margin-bottom:4px}
    .doc-meta{font-size:.75rem;opacity:.55}
    .toc{background:rgba(108,99,255,.07);border:1px solid rgba(108,99,255,.15);border-radius:10px;padding:16px 20px;margin-bottom:24px}
    .toc h2{font-size:.8rem;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em;color:#6c63ff}
    .toc ol{padding-left:16px;font-size:.84rem}.toc li{margin-bottom:3px}.toc a{color:#6c63ff}
    .stats-panel{background:rgba(108,99,255,.06);border:1px solid rgba(108,99,255,.12);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:.8rem;display:flex;gap:18px;flex-wrap:wrap}
    .stats-panel strong{color:#6c63ff}
    .msg-block{margin-bottom:20px}
    .system-msg{background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:10px;padding:14px 18px}
    .msg-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    .msg-avatar{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;flex-shrink:0}
    .msg-avatar.user{background:#6c63ff;color:#fff}
    .msg-avatar.ai{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
    .msg-name{font-weight:700;font-size:.84rem}
    .msg-time{font-size:.7rem;opacity:.45;margin-left:auto}
    .msg-body{padding-left:34px;font-size:.88rem}
    .msg-body p{margin-bottom:8px}
    .msg-body h1{font-size:1.25rem;font-weight:700;margin:14px 0 6px}
    .msg-body h2{font-size:1.05rem;font-weight:700;margin:12px 0 6px}
    .msg-body h3{font-size:.92rem;font-weight:700;margin:10px 0 6px}
    .msg-body ul,.msg-body ol{padding-left:18px;margin-bottom:8px}
    .msg-body li{margin-bottom:3px}
    .msg-body pre{background:rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:12px 14px;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:.78rem;margin:8px 0;white-space:pre-wrap;word-break:break-all}
    .preview-doc.theme-dark .msg-body pre{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.07)}
    .msg-body code{font-family:'JetBrains Mono',monospace;font-size:.8em;background:rgba(108,99,255,.1);border-radius:4px;padding:1px 4px}
    .msg-body pre code{background:none;padding:0}
    .msg-body table{width:100%;border-collapse:collapse;font-size:.83rem;margin:10px 0}
    .msg-body th{background:rgba(108,99,255,.1);font-weight:700}
    .msg-body th,.msg-body td{border:1px solid rgba(0,0,0,.1);padding:7px 10px;text-align:left}
    .preview-doc.theme-dark .msg-body th,.preview-doc.theme-dark .msg-body td{border-color:rgba(255,255,255,.09)}
    .msg-divider{border:none;border-top:1px solid rgba(0,0,0,.07);margin:16px 0}
    .preview-doc.theme-dark .msg-divider{border-top-color:rgba(255,255,255,.06)}
    .msg-body blockquote{border-left:3px solid #6c63ff;margin:10px 0;padding:8px 14px;background:rgba(108,99,255,.05);border-radius:0 6px 6px 0}
    .msg-body strong{font-weight:700}
    .msg-body em{font-style:italic}
  </style>\`;
}

// ── Export: PDF ────────────────────────────────────────────
async function exportPDF(docHTML, options) {
  const container = document.createElement("div");
  container.innerHTML = getPreviewStyles() + docHTML;
  container.style.cssText = "width:794px;padding:40px;font-family:Inter,sans-serif;position:fixed;left:-9999px;top:-9999px;";
  document.body.appendChild(container);
  const fmtMap = { a4: "a4", letter: [215.9, 279.4], legal: [215.9, 355.6] };
  const bg = { dark: "#1a1a2e", sepia: "#f5f0e8", minimal: "#ffffff", light: "#ffffff" }[options.theme] || "#fff";
  try {
    await html2pdf().set({
      margin:      [15, 15, 20, 15],
      filename:    "chatexport-pro.pdf",
      image:       { type: "jpeg", quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: bg },
      jsPDF:       { unit: "mm", format: fmtMap[options.pageSize] || "a4", orientation: "portrait" },
      pagebreak:   { mode: ["avoid-all", "css", "legacy"] },
    }).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

// ── Export: Markdown ───────────────────────────────────────
function exportMarkdown(messages, options) {
  const now   = new Date().toLocaleString();
  const words = messages.reduce((n, m) => n + countWords(m.content), 0);
  let md = \`# AI Conversation Export\\n\\n> Generated by ChatExport Pro on \${now}\\n\\n\`;
  if (options.stats) {
    md += \`**Stats:** \${messages.length} messages | \${words.toLocaleString()} words | ~\${Math.round(words * 1.33).toLocaleString()} tokens\\n\\n---\\n\\n\`;
  }
  messages.forEach((msg, i) => {
    if (msg.role === "system") { md += \`> \${msg.content}\\n\\n\`; return; }
    const icon = msg.role === "user" ? "You" : msg.name;
    const ts   = (options.timestamps && msg.timestamp) ? \` *(\\${msg.timestamp})*\` : "";
    md += \`## \${icon}\${ts}\\n\\n\${msg.content}\\n\\n\`;
    if (i < messages.length - 1) md += \`---\\n\\n\`;
  });
  downloadFile("chatexport-pro.md", md, "text/markdown");
}

// ── Export: HTML ───────────────────────────────────────────
function exportHTML(docHTML) {
  const full = \`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Conversation — ChatExport Pro</title>
\${getPreviewStyles()}
<style>body{font-family:'Inter',sans-serif;background:#f6f6fb;padding:40px 20px}
.wrapper{max-width:800px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.export-footer{text-align:center;margin-top:40px;font-size:.78rem;color:#aaa}</style>
</head><body>
<div class="wrapper">\${docHTML}
<div class="export-footer">Exported by ChatExport Pro</div>
</div></body></html>\`;
  downloadFile("chatexport-pro.html", full, "text/html");
}

// ── File download ──────────────────────────────────────────
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType + ";charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Scroll reveal animations ───────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.animation = "fade-up 0.5s cubic-bezier(0.4,0,0.2,1) both";
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".feature-card,.step-card,.usecase-card,.privacy-card,.faq-item,.bm-step").forEach(el => {
  el.style.opacity = "0";
  revealObs.observe(el);
});

// ── Spinner style ──────────────────────────────────────────
const spinStyle = document.createElement("style");
spinStyle.textContent = ".spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}@keyframes spin{to{transform:rotate(360deg)}}";
document.head.appendChild(spinStyle);

// ── Header shadow on scroll ────────────────────────────────
window.addEventListener("scroll", () => {
  document.querySelector(".header").style.boxShadow =
    window.scrollY > 20 ? "0 4px 32px rgba(0,0,0,.3)" : "none";
}, { passive: true });

// ── Init ───────────────────────────────────────────────────
// Inject bookmarklet href after DOM ready
window.addEventListener("load", () => {
  const bml = document.getElementById("bookmarklet-link");
  if (bml) bml.href = BOOKMARKLET_CODE;
});

updatePlaceholder();
console.log("%cChatExport Pro ready", "color:#6c63ff;font-weight:bold;font-size:14px");
`;

fs.writeFileSync(path.join(dir, "app.js"), appJS, "utf8");
console.log("app.js written, size=" + appJS.length);
