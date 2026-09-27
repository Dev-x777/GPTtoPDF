# GPTtoPDF

GPTtoPDF is a web application built with [Next.js](https://nextjs.org/) that allows you to seamlessly fetch, parse, and export ChatGPT conversation links into beautifully formatted PDF or DOCX documents. 

## Features

- **Link Parsing**: Simply paste a public ChatGPT link and the app automatically fetches the conversation.
- **Export to PDF**: Generate clean, printable PDF documents of your chats.
- **Export to Word (DOCX)**: Download your conversations as editable Word documents.
- **Markdown Support**: Preserves code blocks, bold text, lists, and other markdown formatting from the original chat.
- **Modern UI**: A sleek, responsive interface built with Tailwind CSS v4 and Lucide React icons.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Markdown Parsing:** [Marked](https://marked.js.org/)
- **Document Export:** [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) & [html-docx-js](https://github.com/evidenceprime/html-docx-js)
- **Data Fetching:** [got-scraping](https://github.com/apify/got-scraping)

## Getting Started

### Prerequisites

Make sure you have Node.js (v18+) and npm installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dev-x777/GPTtoPDF.git
   cd GPTtoPDF
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the app in action.

## Deployment

This project is fully optimized and ready to be deployed on Vercel.

1. Push your code to a Git repository (GitHub, GitLab, etc.).
2. Import the project into [Vercel](https://vercel.com/).
3. Vercel will automatically detect the Next.js framework and configure the build settings.
4. Click **Deploy**.

## License

This project is open-source and available under the [MIT License](LICENSE).
