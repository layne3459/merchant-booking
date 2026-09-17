import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniRoot = path.resolve(__dirname, '..');
const ttf = path.resolve(miniRoot, 'node_modules/wot-design-uni/components/wd-icon/wd-icons.ttf');

function findWxssFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findWxssFiles(full));
      continue;
    }
    if (entry.name.endsWith('.wxss')) results.push(full);
  }
  return results;
}

function patchWxss(filePath, base64) {
  let wxss = fs.readFileSync(filePath, 'utf8');
  if (!wxss.includes('wd-icons')) return false;

  const base64Face = `@font-face {
  font-family: "wd-icons";
  src: url("data:font/ttf;base64,${base64}") format("truetype");
  font-weight: normal;
  font-style: normal;
}`;

  let next = wxss
    .replace(/@font-face\s*\{[\s\S]*?font-family:\s*["']?wd-icons["']?[\s\S]*?\}/g, base64Face)
    .replace(/url\(["']?[^"')]*wd-icons[^"')]*\.ttf[^"')]*["']?\)/gi, `url("data:font/ttf;base64,${base64}")`);

  if (next === wxss) return false;
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

export function fixWdIconWxss() {
  if (!fs.existsSync(ttf)) {
    console.warn('[fix-wd-icon-wxss] wd-icons.ttf not found, skip');
    return 0;
  }

  const base64 = fs.readFileSync(ttf).toString('base64');
  const distRoots = [
    path.resolve(miniRoot, 'dist/dev/mp-weixin'),
    path.resolve(miniRoot, 'dist/build/mp-weixin'),
  ];

  let patched = 0;
  for (const root of distRoots) {
    for (const file of findWxssFiles(root)) {
      if (patchWxss(file, base64)) patched += 1;
    }
  }

  if (patched > 0) {
    console.log(`[fix-wd-icon-wxss] patched ${patched} wxss file(s) (base64)`);
  }
  return patched;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  fixWdIconWxss();
}
