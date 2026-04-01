const fs = require('fs');
const path = require('path');

const STYLES_DIR = path.join(__dirname, '../../styles');

let stylesCache = null;

function loadStyles() {
  if (stylesCache) return stylesCache;

  const files = fs.readdirSync(STYLES_DIR).filter(f => f.endsWith('.txt'));
  stylesCache = files.map((file, index) => {
    const name = path.basename(file, '.txt');
    const content = fs.readFileSync(path.join(STYLES_DIR, file), 'utf-8');
    return { id: index.toString(), name, content, filename: file };
  });

  return stylesCache;
}

function getStyle(id) {
  return loadStyles().find(s => s.id === id);
}

function getStyleList() {
  return loadStyles().map(s => ({ id: s.id, name: s.name }));
}

// Reset cache (useful for adding new styles without restart)
function invalidateCache() {
  stylesCache = null;
}

module.exports = { getStyle, getStyleList, invalidateCache };
