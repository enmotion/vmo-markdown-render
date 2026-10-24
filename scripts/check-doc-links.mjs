import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, join, extname } from 'node:path';

// 检查 VitePress 实际生成的目标和锚点，而非猜测 Markdown 标题的 slug。
const root = resolve('docs/.vitepress/dist');
const base = new URL(process.env.DOCS_BASE || '/', 'https://docs.local').pathname;
const pages = new Map();
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith('.html')) pages.set(file, await readFile(file, 'utf8'));
  }
}
try { await walk(root); } catch { throw new Error('请先运行 npm run docs:build / Run npm run docs:build first'); }
const exists = async path => { try { return (await stat(path)).isFile(); } catch { return false; } };
const failures = new Set();
let links = 0;
for (const [file, html] of pages) {
  const pageUrl = new URL(base + relative(root, file).split('\\').join('/'), 'https://docs.local');
  for (const [, href] of html.matchAll(/\bhref="([^"]*)"/g)) {
    const url = new URL(href.replaceAll('&amp;', '&'), pageUrl);
    if (url.origin !== pageUrl.origin) continue;
    // assets 与静态下载检查存在性；外站、mailto 等跳过。
    links++;
    const path = decodeURIComponent(url.pathname);
    if (!path.startsWith(base)) { failures.add(`${relative(root, file)} → ${href} (outside DOCS_BASE)`); continue; }
    let target = resolve(root, path.slice(base.length));
    if (!await exists(target)) {
      if (await exists(join(target, 'index.html'))) target = join(target, 'index.html');
      else if (!extname(target) && await exists(target + '.html')) target += '.html';
      else { failures.add(`${relative(root, file)} → ${href} (missing file)`); continue; }
    }
    if (url.hash && extname(target) === '.html') {
      const id = decodeURIComponent(url.hash.slice(1));
      const ids = new Set([...(pages.get(target) ?? '').matchAll(/\bid="([^"]*)"/g)].map(match => match[1]));
      if (!ids.has(id)) failures.add(`${relative(root, file)} → ${href} (missing anchor)`);
    }
  }
}
if (failures.size) { console.error([...failures].join('\n')); process.exitCode = 1; }
else console.log(`Checked ${pages.size} HTML pages and ${links} local links/anchors.`);
