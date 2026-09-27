const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('.'));

function extractFromMapping(mapping) {
  const messages = [];
  const nodes = Object.values(mapping);
  let rootId = null;
  for (const n of nodes) {
    if (!n.parent) { rootId = n.id; break; }
  }
  function walk(nodeId, depth) {
    if (!nodeId || depth > 1000) return;
    const node = mapping[nodeId];
    if (!node) return;
    const msg = node.message;
    if (msg && msg.content) {
      const role = msg.author?.role;
      const parts = msg.content?.parts;
      if (parts && (role === 'user' || role === 'assistant')) {
        const text = parts.filter(p => typeof p === 'string').join('\n').trim();
        if (text) {
          messages.push((role === 'user' ? 'You: ' : 'ChatGPT: ') + text);
        }
      }
    }
    if (node.children && node.children.length > 0) {
      // Follow the last child (the active branch)
      walk(node.children[node.children.length - 1], depth + 1);
    }
  }
  walk(rootId, 0);
  return messages.length > 0 ? messages.join('\n\n---\n\n') : null;
}

app.get('/api/fetch-chat', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid URL');
  }

  try {
    // Extract the share ID from the URL (e.g. https://chatgpt.com/share/6ab237c6-ec08-83e8-9d61-2f5bb9b128be)
    const shareIdMatch = targetUrl.match(/\/share\/([a-zA-Z0-9\-]+)/);
    if (!shareIdMatch) {
      return res.status(400).send('Invalid ChatGPT share link format');
    }
    const shareId = shareIdMatch[1];
    const backendApiUrl = `https://chatgpt.com/backend-api/share/${shareId}`;

    // Dynamically import gotScraping
    const { gotScraping } = await import('got-scraping');
    
    // Fetch using got-scraping to spoof TLS fingerprint and bypass Cloudflare
    const response = await gotScraping({
      url: backendApiUrl,
      headerGeneratorOptions: {
        browsers: [{name: 'chrome', minVersion: 120, maxVersion: 121}],
        devices: ['desktop'],
        operatingSystems: ['windows']
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch from ChatGPT: HTTP ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);
    if (!data.mapping) {
      throw new Error('Invalid JSON format from ChatGPT (missing mapping)');
    }

    const conversationText = extractFromMapping(data.mapping);
    if (!conversationText) {
      return res.status(500).send('No messages found in the conversation data.');
    }

    res.send(conversationText);
  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ChatExport Pro server running at http://localhost:${PORT}`);
});
