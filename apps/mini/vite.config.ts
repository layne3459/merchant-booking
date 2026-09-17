import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { fixWdIconWxss } from './scripts/fix-wd-icon-wxss.mjs';

const repoRoot = path.resolve(__dirname, '../..');
const miniRoot = __dirname;
const patchFontScript = path.resolve(miniRoot, 'scripts/patch-wd-icon-font.mjs');

function writeDevPrivateConfig() {
  const outDir = path.resolve(miniRoot, 'dist/dev/mp-weixin');
  if (!fs.existsSync(outDir)) return;
  fs.writeFileSync(
    path.join(outDir, 'project.private.config.json'),
    `${JSON.stringify({ description: '本地开发配置', projectname: '预约会员小程序', setting: { urlCheck: false } }, null, 2)}\n`,
  );
}

function patchWdIconSource() {
  if (!fs.existsSync(patchFontScript)) return;
  execFileSync(process.execPath, [patchFontScript], { stdio: 'inherit', cwd: miniRoot });
}

function ensureWotMpComponent(name: string) {
  const distRoots = [
    path.resolve(miniRoot, 'dist/dev/mp-weixin'),
    path.resolve(miniRoot, 'dist/build/mp-weixin'),
  ];
  const jsonContent = Buffer.from(
    JSON.stringify({ component: true, usingComponents: {} }),
    'utf8',
  );

  for (const root of distRoots) {
    if (!fs.existsSync(root)) continue;
    const dir = path.join(root, 'node-modules', 'wot-design-uni', 'components', name);
    const jsonPath = path.join(dir, `${name}.json`);
    const wxml = path.join(dir, `${name}.wxml`);
    const wxss = path.join(dir, `${name}.wxss`);
    const js = path.join(dir, `${name}.js`);

    let jsonValid = false;
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath);
        const start = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? 3 : 0;
        JSON.parse(raw.subarray(start).toString('utf8'));
        jsonValid = start === 0;
      } catch {
        jsonValid = false;
      }
    }

    const needsStub = !jsonValid || !fs.existsSync(wxml) || !fs.existsSync(wxss) || !fs.existsSync(js);
    if (!needsStub) continue;

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(jsonPath, jsonContent);
    if (!fs.existsSync(wxml)) {
      fs.writeFileSync(wxml, `<view class="${name}"><slot /></view>\n`);
    }
    if (!fs.existsSync(wxss)) {
      fs.writeFileSync(wxss, `.${name}{display:block}\n`);
    }
    if (!fs.existsSync(js)) {
      fs.writeFileSync(
        js,
        '"use strict";Component({options:{virtualHost:true,styleIsolation:"shared"}});\n',
      );
    }
  }
}

function patchMpOutput() {
  writeDevPrivateConfig();
  fixWdIconWxss();
  // WeChat 2.01 + lazyCodeLoading still opens wd-card when compiling pages/card,
  // even after the source stopped using it.
  ensureWotMpComponent('wd-card');
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, repoRoot, ''), ...loadEnv(mode, miniRoot, '') };
  const wxAppId = env.VITE_WX_APPID || env.WX_APPID || '';
  const apiBase = env.VITE_API_BASE || 'http://127.0.0.1:3000/api';

  return {
    plugins: [
      uni(),
      {
        name: 'fix-wd-icon-font',
        buildStart() {
          patchWdIconSource();
        },
        writeBundle() {
          patchMpOutput();
        },
        closeBundle() {
          patchMpOutput();
        },
      },
    ],
    envDir: repoRoot,
    define: {
      'import.meta.env.VITE_WX_APPID': JSON.stringify(wxAppId),
      'import.meta.env.VITE_API_BASE': JSON.stringify(apiBase),
    },
    build: {
      assetsInlineLimit: 10 * 1024 * 1024,
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
