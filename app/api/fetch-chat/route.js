import { NextResponse } from 'next/server';

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
      walk(node.children[node.children.length - 1], depth + 1);
    }
  }
  walk(rootId, 0);
  return messages.length > 0 ? messages.join('\n\n---\n\n') : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const shareIdMatch = targetUrl.match(/\/share\/([a-zA-Z0-9\-]+)/);
    if (!shareIdMatch) {
      return NextResponse.json({ error: 'Invalid ChatGPT share link format' }, { status: 400 });
    }
    const shareId = shareIdMatch[1];
    const backendApiUrl = `https://chatgpt.com/backend-api/share/${shareId}`;

    // Dynamically import gotScraping
    const { gotScraping } = await import('got-scraping');
    
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
      return NextResponse.json({ error: 'No messages found in the conversation data.' }, { status: 500 });
    }

    return NextResponse.json({ text: conversationText });
  } catch (err) {
    console.error('Fetch error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
