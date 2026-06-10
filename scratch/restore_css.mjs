import fs from 'fs';
import path from 'path';

function restoreFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const styleSrcRegex = /<style src="\.\/(.*?\.css)"><\/style>/;
  const match = content.match(styleSrcRegex);

  if (match) {
    const cssFileName = match[1];
    const cssPath = path.join(path.dirname(filePath), cssFileName);
    
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      content = content.replace(styleSrcRegex, `<style>\n${cssContent.trim()}\n</style>`);
      fs.writeFileSync(filePath, content);
      console.log(`Restored CSS into ${filePath}`);
      fs.unlinkSync(cssPath); // Delete the external CSS file since it's restored
    } else {
      console.log(`CSS file not found for ${filePath}`);
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
      restoreFile(fullPath);
    }
  }
}

processDirectory('src/lib/components');
restoreFile('src/routes/+page.svelte');
