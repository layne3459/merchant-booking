import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniRoot = path.resolve(__dirname, '..');
const envLocalPath = path.resolve(miniRoot, '.env.local');

const VIRTUAL_RE = /virtual|vmware|vethernet|hyper|wsl|docker|tap|tun|loopback|bluetooth|npcap|sing-tun/i;

function scoreInterface(name) {
  if (VIRTUAL_RE.test(name)) return -1;
  const n = name.toLowerCase();
  if (/wi-?fi|wlan|wireless|无线/.test(n)) return 3;
  if (/以太网|ethernet|eth\d/i.test(n)) return 2;
  return 1;
}

function getLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    const score = scoreInterface(name);
    if (score < 0) continue;
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
        candidates.push({ name, address: net.address, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address || '127.0.0.1';
}

const ip = getLanIp();
const apiBase = `http://${ip}:3000/api`;
const nextLine = `VITE_API_BASE=${apiBase}`;

let content = '';
if (fs.existsSync(envLocalPath)) {
  content = fs.readFileSync(envLocalPath, 'utf8');
  if (/^VITE_API_BASE=/m.test(content)) {
    content = content.replace(/^VITE_API_BASE=.*$/m, nextLine);
  } else {
    content = `${content.trimEnd()}\n${nextLine}\n`;
  }
} else {
  content = `${nextLine}\n`;
}

fs.writeFileSync(envLocalPath, content, 'utf8');
console.log(`[sync-api-base] 小程序 API 地址: ${apiBase}`);
