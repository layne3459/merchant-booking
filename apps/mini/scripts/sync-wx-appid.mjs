import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(miniRoot, '../..');
const manifestPath = path.resolve(miniRoot, 'src/manifest.json');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function readWxAppId() {
  const envFiles = [
    path.join(miniRoot, '.env.local'),
    path.join(miniRoot, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, '.env'),
  ];
  for (const file of envFiles) {
    const env = loadEnvFile(file);
    const appId = env.VITE_WX_APPID || env.WX_APPID || '';
    if (appId) return appId;
  }
  return process.env.VITE_WX_APPID || process.env.WX_APPID || '';
}

export function isRealWxAppId(appId) {
  return /^wx[a-f0-9]{16}$/i.test(appId) && !appId.includes('xxxx');
}

function patchManifest(appId) {
  let content = fs.readFileSync(manifestPath, 'utf8');
  const nextRoot = content.replace(/^(\s*"appid"\s*:\s*)"[^"]*"/m, `$1"${appId}"`);
  const nextMp = nextRoot.replace(
    /("mp-weixin"\s*:\s*\{[\s\S]*?"appid"\s*:\s*)"[^"]*"/,
    `$1"${appId}"`,
  );
  if (nextMp === content) return false;
  fs.writeFileSync(manifestPath, nextMp, 'utf8');
  return true;
}

const appId = readWxAppId();

if (isRealWxAppId(appId)) {
  const changed = patchManifest(appId);
  console.log(
    changed
      ? `[sync-wx-appid] manifest 已写入 AppID: ${appId}`
      : `[sync-wx-appid] manifest 已是 AppID: ${appId}`,
  );
} else if (appId) {
  console.warn(
    `[sync-wx-appid] 跳过 manifest 写入：${appId} 为占位 AppID，开发者工具将使用游客模式`,
  );
  console.warn(
    '[sync-wx-appid] 请在 merchant-booking/.env 填写真实 WX_APPID，或在微信开发者工具中选择测试号',
  );
} else {
  console.warn('[sync-wx-appid] 未找到 WX_APPID，小程序将以游客模式运行');
}
