const fs = require('fs');

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const apiPaths = content.match(/[\"\'](\/api\/.*?)[\"\']/g) || [];
  console.log(`API Paths in ${file}:`);
  [...new Set(apiPaths)].forEach(u => console.log(u));
}

checkFile('C:/Users/devje/.gemini/antigravity-ide/brain/e2d74409-bdb6-4442-bdb3-c5b7b1f65e4e/.system_generated/steps/273/content.md');
checkFile('C:/Users/devje/.gemini/antigravity-ide/brain/e2d74409-bdb6-4442-bdb3-c5b7b1f65e4e/.system_generated/steps/318/content.md');
