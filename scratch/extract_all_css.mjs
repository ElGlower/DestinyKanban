import fs from 'fs';
import path from 'path';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const styleRegex = /<style>([\s\S]*?)<\/style>/;
  const match = content.match(styleRegex);

  if (match) {
    const cssContent = match[1].trim();
    if (cssContent.length > 0) {
      const ext = path.extname(filePath);
      const cssPath = filePath.slice(0, -ext.length) + '.css';
      fs.writeFileSync(cssPath, cssContent + '\n');
      const baseName = path.basename(cssPath);
      content = content.replace(styleRegex, `<style src="./${baseName}"></style>`);
      fs.writeFileSync(filePath, content);
      console.log(`Extracted CSS from ${filePath} to ${cssPath}`);
    }
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.svelte')) {
      processFile(fullPath);
    }
  }
}

processDirectory('src/lib/components');
