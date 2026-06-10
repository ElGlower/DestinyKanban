import fs from 'fs';

const path = 'src/routes/+page.svelte';
const cssPath = 'src/routes/+page.css';
let content = fs.readFileSync(path, 'utf8');

const styleRegex = /<style>([\s\S]*?)<\/style>/;
const match = content.match(styleRegex);

if (match) {
  fs.writeFileSync(cssPath, match[1].trim() + '\n');
  content = content.replace(styleRegex, '<style src="./+page.css"></style>');
  fs.writeFileSync(path, content);
  console.log('Successfully extracted CSS to +page.css');
} else {
  console.log('No <style> block found');
}
