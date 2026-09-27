const fs = require('fs');
let html = fs.readFileSync('old/index.html', 'utf8');
const bodyMatch = html.match(/<body>([\s\S]*?)<script src=\"app\.js\"><\/script>/);
if (bodyMatch) {
  let jsx = bodyMatch[1]
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/style=\"([^\"]*)\"/g, (match, styleStr) => {
      let styleObj = {};
      styleStr.split(';').forEach(rule => {
        let parts = rule.split(':');
        if (parts.length === 2) {
          let key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
          styleObj[key] = parts[1].trim();
        }
      });
      return `style={{ ${Object.entries(styleObj).map(([k,v]) => `${k}: '${v}'`).join(', ')} }}`;
    });
  
  // self close inputs and SVGs
  jsx = jsx.replace(/<input([^>]*[^\/])>/g, '<input$1 />');
  fs.writeFileSync('raw_jsx.txt', jsx);
  console.log('JSX written to raw_jsx.txt');
}
