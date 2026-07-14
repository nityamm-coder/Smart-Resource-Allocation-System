const fs = require('fs');
const code = fs.readFileSync('public/app.js', 'utf8');

console.log("=== SELECTORS IN app.js ===");
const idRegex = /document\.getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;
let match;
while ((match = idRegex.exec(code)) !== null) {
  console.log(`ID: ${match[1]}`);
}

const qsRegex = /document\.querySelector(All)?\s*\(\s*["']([^"']+)["']\s*\)/g;
while ((match = qsRegex.exec(code)) !== null) {
  console.log(`QS: ${match[2]}`);
}
