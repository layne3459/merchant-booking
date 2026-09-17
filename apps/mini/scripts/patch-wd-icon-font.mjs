import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const target = path.resolve(pkgRoot, 'node_modules/wot-design-uni/components/wd-icon/index.scss');
const ttf = path.resolve(pkgRoot, 'node_modules/wot-design-uni/components/wd-icon/wd-icons.ttf');

function stripFontFaceBlocks(content) {
  return content
    .replace(/\/\* #ifndef MP-WEIXIN \*\/[\s\S]*?\/\* #endif \*\/\s*/g, '')
    .replace(/\/\* #ifdef MP-WEIXIN \*\/[\s\S]*?\/\* #endif \*\/\s*/g, '')
    .replace(
      /\/\*\s*#ifdef\s+APP-PLUS\s*\|\|\s*H5(?:\s*\|\|\s*MP-WEIXIN)?\s*\*\/[\s\S]*?\/\*\s*#endif\s*\*\//g,
      '',
    )
    .replace(/@font-face\s*\{[\s\S]*?font-family:\s*['"]?wd-icons['"]?[\s\S]*?\}\s*/g, '');
}

function buildPatch(base64) {
  return `@font-face {
  font-family: 'wd-icons';
  src: url('data:font/ttf;base64,${base64}') format('truetype');
  font-weight: normal;
  font-style: normal;
}`;
}

function isBase64Patched(content) {
  return (
    content.includes('data:font/ttf;base64,') &&
    !content.includes("url('./wd-icons.ttf')") &&
    !content.includes('at.alicdn.com') &&
    !content.includes('#ifdef MP-WEIXIN')
  );
}

if (!fs.existsSync(target)) {
  console.warn('[patch-wd-icon-font] wot-design-uni not installed, skip');
  process.exit(0);
}

if (!fs.existsSync(ttf)) {
  console.warn('[patch-wd-icon-font] wd-icons.ttf not found, skip');
  process.exit(1);
}

const base64 = fs.readFileSync(ttf).toString('base64');
const patchedBlock = buildPatch(base64);
let content = fs.readFileSync(target, 'utf8');

if (isBase64Patched(content)) {
  console.log('[patch-wd-icon-font] already patched (base64 only)');
  process.exit(0);
}

content = stripFontFaceBlocks(content);

if (!content.includes('@import')) {
  console.warn('[patch-wd-icon-font] unexpected index.scss format');
  process.exit(1);
}

content = content.replace(
  "@import '../common/abstracts/mixin';",
  `@import '../common/abstracts/mixin';\n\n${patchedBlock}\n`,
);

fs.writeFileSync(target, content, 'utf8');
console.log('[patch-wd-icon-font] patched wd-icon font (base64 only)');
