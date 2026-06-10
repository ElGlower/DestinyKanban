const fs = require('fs');
const path = 'src/routes/+page.svelte';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/<style>[\s\S]*?<\/style>\r?\n?/, '<style src="./+page.css"></style>\n');
fs.writeFileSync(path, content);
console.log('Replaced successfully');
