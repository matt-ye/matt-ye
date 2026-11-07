// node --test scripts/update-readme.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStats, parsePosts, postsBlock, replaceBlock } from './update-readme.mjs';

test('parseStats reads the numbers and fails when one is missing', () => {
  const md = 'Total Events\n\n168\n\n場次累計\n\nTotal Hours\n\n283\n\nAudience\n\n13,681\n';
  assert.deepEqual(parseStats(md), { events: '168', hours: '283', audience: '13,681' });
  assert.throws(() => parseStats('Total Events\n\n168\n'), /Total Hours/);
});

const item = (title, link, date) =>
  `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate></item>`;

test('parsePosts sorts newest first, unescapes titles, and keeps only /writing/ links', () => {
  const xml =
    item('舊文', 'https://mattye.dev/writing/old/', 'Mon, 01 Jun 2026 00:00:00 GMT') +
    item('A &amp; B', 'https://mattye.dev/writing/new/', 'Wed, 19 Aug 2026 00:00:00 GMT') +
    item('專欄', 'https://mattye.dev/projects/marketing/x/', 'Thu, 20 Aug 2026 00:00:00 GMT') +
    item('排除', 'https://mattye.dev/writing/In-Memory-of-Miguel-Li/', 'Thu, 20 Aug 2026 00:00:00 GMT') +
    item('外站', 'https://evil.example/writing/x', 'Thu, 20 Aug 2026 00:00:00 GMT');
  const posts = parsePosts(xml);
  assert.deepEqual(posts.map((p) => p.title), ['A & B', '舊文']);
  assert.equal(postsBlock(posts.slice(0, 1)), '- [A & B](https://mattye.dev/writing/new/) · 2026-08-19');
});

test('parsePosts refuses an empty feed', () => {
  assert.throws(() => parsePosts('<rss></rss>'), /解析不出/);
});

test('replaceBlock only touches its own block and is stable', () => {
  const doc = 'a\n<!-- AUTO:x -->\nold\n<!-- /AUTO:x -->\nb\n';
  const out = replaceBlock(doc, 'x', 'new');
  assert.equal(out, 'a\n<!-- AUTO:x -->\nnew\n<!-- /AUTO:x -->\nb\n');
  assert.equal(replaceBlock(out, 'x', 'new'), out);
  assert.throws(() => replaceBlock(doc, 'y', 'new'), /y/);
});
