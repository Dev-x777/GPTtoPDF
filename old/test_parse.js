const fs = require('fs');
const html = fs.readFileSync('chatgpt_test.html', 'utf8');
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let bodyHTML = bodyMatch ? bodyMatch[1] : '';
const stripped = bodyHTML
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '\"').replace(/&#39;/g, '\'')
  .replace(/\s{2,}/g, ' ')
  .trim();
console.log('Length:', stripped.length);
console.log(stripped.substring(0, 500));
