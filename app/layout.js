import './globals.css'

export const metadata = {
  title: 'ChatExport Pro — AI Chat to PDF Converter',
  description: 'Convert ChatGPT, Claude, Gemini conversations to beautiful PDFs, Word docs, or Markdown. Live preview, dark mode, custom themes, table of contents — free, no login.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" defer></script>
        <script src="https://unpkg.com/html-docx-js/dist/html-docx.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
