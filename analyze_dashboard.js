const fs = require('fs');
const html = fs.readFileSync('public/dashboard.html', 'utf8');

// Find all elements with class "sidebar-item" or elements with ID ending in "view-container" or having "col-"
console.log("=== SIDEBAR ITEMS ===");
const sidebarRegex = /class="sidebar-item"[^>]*id="([^"]+)"/g;
let match;
while ((match = sidebarRegex.exec(html)) !== null) {
  console.log(`Sidebar Item ID: ${match[1]}`);
}

console.log("\n=== SECTION CONTAINERS ===");
const sectionRegex = /id="([^"]+-view-container|[^"]+-section|[^"]+-panel)"/g;
while ((match = sectionRegex.exec(html)) !== null) {
  console.log(`Section/Panel ID: ${match[1]}`);
}
