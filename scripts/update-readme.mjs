// 把 README 標記區塊內的數字與文章換成 mattye.dev 的最新資料。
// 只讀公開網站：專案清單是人工決定要公開的，刻意不在自動範圍內。
// RSS 也包含各專案專欄的文章，只收 /writing/，新欄目要不要露出同樣由人決定。
// 任何資料抓不到或解析不出來就直接失敗，不會把 README 寫壞。
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITE = 'https://mattye.dev';
// mattye.dev 對 GitHub Actions 的 IP 回 403；同一份內容從 Pages 網址讀。連結仍指向 mattye.dev。
const SOURCE = 'https://personal-website-1m7.pages.dev';
const POSTS = 3;
// 公開但不適合放在 GitHub 首頁的文章
const EXCLUDE = new Set([`${SITE}/writing/In-Memory-of-Miguel-Li/`]);

export function parseStats(md) {
  const read = (label) => {
    const m = md.match(new RegExp(`${label}\\s+([\\d,]+)`));
    if (!m) throw new Error(`speeches.md 找不到 ${label}`);
    return m[1];
  };
  return { events: read('Total Events'), hours: read('Total Hours'), audience: read('Audience') };
}

const unescapeXml = (s) =>
  s
    .replace(/^<!\[CDATA\[|\]\]>$/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

export function parsePosts(xml, limit = POSTS) {
  const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const tag = (name) =>
      unescapeXml(item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? '');
    return { title: tag('title'), link: tag('link'), date: new Date(tag('pubDate')) };
  });
  const valid = posts
    .filter(
      (p) =>
        p.title &&
        p.link.startsWith(`${SITE}/writing/`) &&
        !EXCLUDE.has(p.link) &&
        !Number.isNaN(p.date.getTime())
    )
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
  if (!valid.length) throw new Error('rss.xml 解析不出任何文章');
  return valid;
}

export const statsBlock = ({ events, hours, audience }) =>
  `2020 年至今累積 **${events}** 場演講、工作坊與競賽培訓，**${hours}** 小時講台時數，觸及 **${audience}** 人次；主題涵蓋學術簡報、研究溝通、EMI 教學。`;

export const postsBlock = (posts) =>
  posts
    .map((p) => `- [${p.title.replace(/([\[\]])/g, '\\$1')}](${p.link}) · ${p.date.toISOString().slice(0, 10)}`)
    .join('\n');

export function replaceBlock(readme, name, body) {
  const open = `<!-- AUTO:${name} -->`;
  const close = `<!-- /AUTO:${name} -->`;
  const start = readme.indexOf(open);
  const end = readme.indexOf(close);
  if (start < 0 || end < start) throw new Error(`README 找不到 ${name} 區塊標記`);
  return `${readme.slice(0, start + open.length)}\n${body}\n${readme.slice(end)}`;
}

async function get(path) {
  const res = await fetch(`${SOURCE}${path}`, { headers: { 'User-Agent': 'matt-ye-readme-updater' } });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.text();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const stats = parseStats(await get('/md/speeches.md'));
  const posts = parsePosts(await get('/rss.xml'));
  let readme = readFileSync('README.md', 'utf8');
  readme = replaceBlock(readme, 'stats', statsBlock(stats));
  readme = replaceBlock(readme, 'writing', postsBlock(posts));
  writeFileSync('README.md', readme);
}
