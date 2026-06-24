const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const SITE = 'https://media.braintaiwan.com';
const AUTHOR = {
  '@type': 'Person',
  name: '施懿恩',
  url: 'https://braintaiwan.com/',
};
const PUBLISHER = {
  '@type': 'Organization',
  name: 'BrainTaiwan Media',
  logo: {
    '@type': 'ImageObject',
    url: `${SITE}/ian.jpg`,
  },
};

const fallbackDescriptions = {
  '2026-guideline.html': '整理 2026 中風治療新指引對一般讀者最重要的五件事：時間窗、藥物、手術與到院前判斷，幫助病人與家屬掌握治療方向。',
  'golden-hour.html': '中風黃金一小時決定治療機會。本文整理辨識中風、立刻叫救護車、記錄發作時間與避免延誤的到院前處置。',
};

const relatedGroups = {
  stroke: [
    'tia-brain-warning.html',
    'heatstroke-brain.html',
    'summer-cardiac-brain.html',
    'golden-hour.html',
    '2026-guideline.html',
    'duanwu-health.html',
  ],
  sports: [
    'concussion-what-is.html',
    'concussion-wc2026.html',
    'catcher-injuries.html',
  ],
  dementia: [
    'shingles-vaccine-brain.html',
    'oral-brain-dementia.html',
    'dementia-blood-test.html',
    'dementia-myths.html',
    'dementia-handwriting.html',
    'dementia-anosognosia.html',
    'dementia-early-signs.html',
    'dementia-law.html',
  ],
  sleep: [
    'insomnia-when-to-see-doctor.html',
    'insomnia-sleeping-pills-safety.html',
    'insomnia-new-drugs.html',
  ],
  youth: [
    'iron-fist-drugs.html',
    'zombie-vape.html',
    'iron-fist-brain.html',
  ],
  nutrition: [
    'milk-nutrition-evidence.html',
    'milk-antibiotic-residue.html',
  ],
};

const relatedLabels = {
  stroke: '中風與神經急症延伸閱讀',
  sports: '運動傷害與腦震盪延伸閱讀',
  dementia: '失智與腦健康延伸閱讀',
  sleep: '睡眠與用藥安全延伸閱讀',
  youth: '家長必讀與用藥風險延伸閱讀',
  nutrition: '營養與食品安全延伸閱讀',
};

const relatedCss = `.bt-related-reading{background:#fff;border:1px solid #e1ebe8;border-radius:10px;padding:22px 24px;margin:38px 0 10px}
.bt-related-kicker{font-size:8pt;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#00695c;margin-bottom:8px}
.bt-related-reading h2{font-size:17pt;line-height:1.35;color:#0d1f1c;margin:0 0 14px;padding:0;border:0}
.bt-related-links{display:grid;gap:10px}
.bt-related-links a{display:block;color:#00695c;text-decoration:none;font-size:11pt;line-height:1.55;font-weight:700;padding:10px 12px;border-radius:8px;background:#f4faf8;border:1px solid #dcebe7}
.bt-related-links a:hover{background:#e6f3ef;text-decoration:none}`;

function readPost(file) {
  return fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
}

function writePost(file, html) {
  fs.writeFileSync(path.join(POSTS_DIR, file), html, 'utf8');
}

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extract(pattern, html) {
  return html.match(pattern)?.[1]?.trim() || '';
}

function getTitle(html) {
  return stripTags(extract(/<h1[^>]*>([\s\S]*?)<\/h1>/, html) || extract(/<title>([\s\S]*?)<\/title>/, html).replace(/\s+—\s+BrainTaiwan$/, ''));
}

function getDate(html) {
  const raw = extract(/神經專科醫師 · ([0-9]{4}\.[0-9]{2}(?:\.[0-9]{2})?)/, html)
    || extract(/施懿恩 · ([0-9]{4}\.[0-9]{2}(?:\.[0-9]{2})?)/, html);
  if (!raw) return '2026-06';
  const parts = raw.split('.');
  return parts.join('-');
}

function getDescription(file, html) {
  return extract(/<meta name="description" content="([^"]*)"/, html)
    || extract(/<meta property="og:description" content="([^"]*)"/, html)
    || extract(/<meta name="twitter:description" content="([^"]*)"/, html)
    || fallbackDescriptions[file]
    || `${getTitle(html)}。BrainTaiwan 神經科醫師以白話整理重點、警訊與下一步。`;
}

function getImage(html) {
  return extract(/<meta property="og:image" content="([^"]*)"/, html) || `${SITE}/og.png`;
}

function getUrl(file, html) {
  return extract(/<meta property="og:url" content="([^"]*)"/, html) || `${SITE}/posts/${file}`;
}

function articleSchema(file, html, description) {
  const url = getUrl(file, html);
  return `<script type="application/ld+json">\n${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: getTitle(html),
    description,
    image: getImage(html),
    url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    author: AUTHOR,
    publisher: PUBLISHER,
    datePublished: getDate(html),
    dateModified: getDate(html),
    inLanguage: 'zh-TW',
  }, null, 2)}\n</script>`;
}

function ensureDescriptions(file, html) {
  const description = getDescription(file, html);
  const escaped = escapeAttr(description);
  let next = html;

  if (/<meta name="description" content="[^"]*">/.test(next)) {
    next = next.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escaped}">`);
  } else {
    next = next.replace(/(<title>[\s\S]*?<\/title>\r?\n)/, `$1<meta name="description" content="${escaped}">\n`);
  }

  next = next.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escaped}">`);
  next = next.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escaped}">`);

  return { html: next, description };
}

function ensureSchema(file, html, description) {
  const schema = articleSchema(file, html, description);
  if (html.includes('application/ld+json')) {
    return html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schema);
  }
  return html.replace(/\n<style>/, `\n${schema}\n<style>`);
}

function groupFor(file) {
  return Object.entries(relatedGroups).find(([, files]) => files.includes(file))?.[0] || null;
}

function relatedBlock(file, titles) {
  const group = groupFor(file);
  if (!group) return '';
  const links = relatedGroups[group]
    .filter((item) => item !== file)
    .slice(0, 4)
    .map((item) => `    <a href="/posts/${item}">${titles[item]}</a>`)
    .join('\n');
  if (!links) return '';
  return `<!-- bt-related-reading -->\n<section class="bt-related-reading" aria-label="${relatedLabels[group]}">\n  <div class="bt-related-kicker">Related Reading</div>\n  <h2>${relatedLabels[group]}</h2>\n  <div class="bt-related-links">\n${links}\n  </div>\n</section>\n<style>\n${relatedCss}\n</style>`;
}

function ensureRelated(file, html, titles) {
  if (html.includes('bt-related-reading') || html.includes('series-box')) return html;
  const block = relatedBlock(file, titles);
  if (!block) return html;
  const targets = [
    /\n<!-- bt-subscribe-box -->/,
    /\n\s*<div class="author-footer">/,
    /\n\s*<div class="back-link">/,
    /\n<\/main>/,
  ];
  for (const target of targets) {
    const match = html.match(target);
    if (match) {
      return html.slice(0, match.index) + `\n\n${block}` + html.slice(match.index);
    }
  }
  return html;
}

const files = fs.readdirSync(POSTS_DIR)
  .filter((file) => file.endsWith('.html') && !file.startsWith('_'))
  .sort();

const titles = Object.fromEntries(files.map((file) => [file, getTitle(readPost(file))]));
let changed = 0;

for (const file of files) {
  const before = readPost(file);
  let html = before;
  const descResult = ensureDescriptions(file, html);
  html = descResult.html;
  html = ensureSchema(file, html, descResult.description);
  html = ensureRelated(file, html, titles);

  if (html !== before) {
    writePost(file, html);
    changed += 1;
  }
}

console.log(`Enhanced ${changed} article(s).`);
