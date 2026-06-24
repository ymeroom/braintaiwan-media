// Converts _src nutrition articles to BrainTaiwan Media HTML pages.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '_src');
const OUT = path.join(__dirname, 'posts');
const SITE = 'https://media.braintaiwan.com';
const DATE = '2026.06.24';

const articles = [
  {
    md: 'milk-nutrition-evidence.md',
    out: 'milk-nutrition-evidence.html',
    title: '',
    desc: '牛奶不是神奇食物，也不是敵人。從 DIAAS、鈣質生物利用率、心血管與骨骼研究，整理牛奶在一般飲食中的真實營養位置。',
    tag: '營養科學 · 食品安全',
    nav: '牛奶營養',
  },
  {
    md: 'milk-antibiotic-residue.md',
    out: 'milk-antibiotic-residue.html',
    title: '',
    desc: '乳牛使用抗生素是真的，市售牛奶風險如何被管控也是真的。從停藥期、MRL、檢驗與抗藥性，看懂牛奶殘留問題。',
    tag: '食品安全 · 抗生素',
    nav: '牛奶安全',
  },
  {
    md: 'soy-isoflavone-myths.md',
    out: 'soy-isoflavone-myths.html',
    title: '',
    desc: '豆漿有植物性雌激素，所以會造成乳癌或讓男性女性化嗎？從大豆異黃酮、乳癌存活研究與男性荷爾蒙統合分析，看懂真正證據。',
    tag: '健康迷思 · 營養科學',
    nav: '豆漿迷思',
  },
];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => {
    codes.push(c);
    return `\x00${codes.length - 1}\x00`;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\x00(\d+)\x00/g, (m, i) => `<code>${esc(codes[Number(i)])}</code>`);
  return s;
}

function renderBlocks(lines) {
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^---\s*$/.test(line)) { html += '<hr>\n'; i++; continue; }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html += `<h${level}>${inline(heading[2].trim())}</h${level}>\n`;
      i++;
      continue;
    }

    if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html += `<blockquote>\n${renderBlocks(buf)}</blockquote>\n`;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i]);
        i++;
      }
      const cells = row => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      html += '<table>\n<thead><tr>' + head.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead>\n<tbody>\n';
      for (const row of body) {
        html += '<tr>' + row.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>\n';
      }
      html += '</tbody></table>\n';
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      html += '<ol>\n';
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>\n`;
        i++;
      }
      html += '</ol>\n';
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      html += '<ul>\n';
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>\n`;
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    const p = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,3}\s|>|---\s*$|\d+\.\s|[-*]\s)/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]))
    ) {
      p.push(lines[i]);
      i++;
    }
    if (p.length) html += `<p>${inline(p.join(' '))}</p>\n`;
  }
  return html;
}

function parse(src) {
  let title = '';
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (fm) {
    const t = fm[1].match(/title:\s*"?(.*?)"?\s*$/m);
    if (t) title = t[1];
    src = src.slice(fm[0].length);
  }
  const lines = src.split(/\r?\n/);
  const h1 = lines.findIndex(l => /^#\s+/.test(l));
  if (h1 !== -1) lines.splice(h1, 1);
  return { title, body: renderBlocks(lines) };
}

const SHARE = `<!-- bt-share -->
<div class="bt-share">
  <span class="bt-rt" id="btReadingTime">閱讀時間</span>
  <div class="bt-share-btns">
    <span class="bt-share-label">分享</span>
    <a class="bt-sh bt-fb" id="btFb" target="_blank" rel="noopener" aria-label="分享到 Facebook">f Facebook</a>
    <a class="bt-sh bt-line" id="btLine" target="_blank" rel="noopener" aria-label="分享到 LINE">LINE</a>
    <a class="bt-sh bt-x" id="btX" target="_blank" rel="noopener" aria-label="分享到 X">X</a>
    <button class="bt-sh bt-copy" id="btCopy" type="button">複製連結</button>
  </div>
</div>
<style>
.bt-share{max-width:720px;margin:0 auto 2.6rem;padding:1.15rem 1.5rem;display:flex;flex-wrap:wrap;gap:.8rem 1.3rem;align-items:center;justify-content:space-between;border-top:1px solid #d8d0c0;border-bottom:1px solid #d8d0c0}
.bt-rt{font-size:.92rem;color:#6f6a62;font-weight:600}
.bt-share-btns{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.bt-share-label{font-size:.85rem;color:#6f6a62;font-weight:700}
.bt-sh{display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 .85rem;border-radius:7px;font-size:.84rem;font-weight:700;text-decoration:none;cursor:pointer;border:none;color:#fff;line-height:1}
.bt-fb{background:#1877f2}.bt-line{background:#06c755}.bt-x{background:#111}.bt-copy{background:#e65100}
.bt-sh:hover{opacity:.85}
</style>
<script>
(function(){
  var url=location.href;
  var title=(document.title||'').replace(/\\s*[—|｜-].*$/,'').trim()||document.title;
  var c=document.querySelector('.article-body, .post-body, main, body');
  if(c){var n=(c.innerText||c.textContent||'').replace(/\\s+/g,'').length;var min=Math.max(1,Math.round(n/420));var rt=document.getElementById('btReadingTime');if(rt)rt.textContent='閱讀時間約 '+min+' 分鐘';}
  var e=encodeURIComponent;
  var fb=document.getElementById('btFb');if(fb)fb.href='https://www.facebook.com/sharer/sharer.php?u='+e(url);
  var ln=document.getElementById('btLine');if(ln)ln.href='https://social-plugins.line.me/lineit/share?url='+e(url);
  var x=document.getElementById('btX');if(x)x.href='https://twitter.com/intent/tweet?url='+e(url)+'&text='+e(title);
  var cp=document.getElementById('btCopy');if(cp)cp.addEventListener('click',function(){if(navigator.clipboard){navigator.clipboard.writeText(url).then(function(){cp.textContent='已複製';setTimeout(function(){cp.textContent='複製連結';},1800);});}});
})();
</script>`;

function seriesBox(items, activeIdx) {
  const links = items.map((item, i) =>
    `    <a href="${item.out}"${i === activeIdx ? ' class="cur"' : ''}>${esc(item.nav || '相關')}　${esc(item.title)}</a>`
  ).join('\n');
  return `  <div class="series-box">
    <div class="sb-h">營養食品科學 · 相關閱讀</div>
${links}
  </div>`;
}

function page(a, contentHtml, activeIdx) {
  const url = `${SITE}/posts/${a.out}`;
  const related = articles.map(item => ({ out: item.out, title: item.title, nav: item.nav }));
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(a.title)} — BrainTaiwan</title>
<meta name="description" content="${esc(a.desc)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='88'%3E%F0%9F%A7%A0%3C/text%3E%3C/svg%3E">
<meta property="og:type" content="article">
<meta property="og:site_name" content="BrainTaiwan Media">
<meta property="og:locale" content="zh_TW">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(a.desc)}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/og.png">
<meta name="twitter:title" content="${esc(a.title)}">
<meta name="twitter:description" content="${esc(a.desc)}">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI','Microsoft JhengHei','PingFang TC',Georgia,serif;background:#fafaf8;color:#1a1a1a}
.topbar{background:linear-gradient(135deg,#004d40,#00695c);padding:14px 24px}
.topbar-inner{max-width:720px;margin:0 auto;display:flex;justify-content:space-between;align-items:center}
.topbar a{color:rgba(255,255,255,.75);text-decoration:none;font-size:11pt}
.topbar a:hover{color:#fff}
.topbar-logo{font-weight:700;font-size:13pt;color:#fff}
main{max-width:720px;margin:0 auto;padding:48px 24px 64px}
.article-tag{display:inline-block;background:#e8f5e9;color:#2e7d32;font-size:10pt;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:16px}
h1{font-size:25pt;font-weight:700;line-height:1.3;color:#0d1f1c;margin-bottom:16px}
.article-meta{display:flex;align-items:center;gap:8px;font-size:11pt;color:#888;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e8e8e8}
.meta-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#00695c,#2e7d32);display:flex;align-items:center;justify-content:center;font-size:14pt;color:#fff;font-weight:700}
.meta-name{font-weight:600;color:#444}
.article-body{font-size:14pt;line-height:1.9;color:#2a2a2a}
.article-body p{margin-bottom:20px}
.article-body h2{font-size:18pt;font-weight:700;color:#0d1f1c;margin:36px 0 14px;padding-left:14px;border-left:4px solid #2e7d32}
.article-body h3{font-size:15pt;font-weight:700;color:#1b5e20;margin:26px 0 10px}
.article-body strong{color:#0d1f1c}
.article-body em{font-style:italic;color:#555}
.article-body a{color:#00695c;text-decoration:none}
.article-body a:hover{text-decoration:underline}
.article-body hr{border:none;border-top:1px solid #e8e8e8;margin:32px 0}
.article-body ul,.article-body ol{margin:0 0 20px;padding-left:1.5em}
.article-body li{margin:.4em 0}
.article-body code{background:#eef2f1;padding:1px 6px;border-radius:5px;font-size:.9em}
.article-body table{width:100%;border-collapse:collapse;margin:24px 0;font-size:12.5pt;border:1px solid #e0e6e4;border-radius:8px;overflow:hidden}
.article-body th,.article-body td{padding:10px 13px;text-align:left;border-bottom:1px solid #eef2f1;vertical-align:top}
.article-body th{background:#00695c;color:#fff;font-weight:600}
.article-body tr:nth-child(even) td{background:#f3f8f6}
.article-body blockquote{margin:24px 0;padding:16px 20px;background:#eef6f4;border-left:4px solid #00695c;border-radius:0 8px 8px 0;color:#37474f;font-size:13pt}
.article-body blockquote p:last-child{margin-bottom:0}
.series-box{background:#fff;border:1px solid #cde5dc;border-radius:12px;padding:18px 22px;margin:44px 0 0}
.series-box .sb-h{font-size:10pt;font-weight:800;letter-spacing:.08em;color:#00695c;text-transform:uppercase;margin-bottom:10px}
.series-box a{display:block;text-decoration:none;color:#455;font-size:11.5pt;padding:8px 0;border-top:1px solid #f0f3f2}
.series-box a:first-of-type{border-top:none}
.series-box a:hover{color:#00695c}
.series-box a.cur{color:#00695c;font-weight:700}
.author-footer{background:#fff;border-radius:10px;padding:24px;border:1px solid #ebebeb;display:flex;gap:16px;align-items:center;margin-top:32px}
.af-avatar{width:52px;height:52px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#00695c,#2e7d32);display:flex;align-items:center;justify-content:center;font-size:18pt;color:#fff;font-weight:700}
.af-name{font-size:12pt;font-weight:700;color:#0d1f1c}
.af-title{font-size:10pt;color:#00695c;font-weight:600;margin-top:2px}
.af-bio{font-size:10.5pt;color:#666;margin-top:6px;line-height:1.6}
.back-link{margin-top:36px}
.back-link a{color:#00695c;text-decoration:none;font-size:11pt;font-weight:600}
.back-link a:hover{text-decoration:underline}
footer{background:#0d1f1c;color:rgba(255,255,255,.4);text-align:center;padding:24px;font-size:10pt;margin-top:40px}
@media(max-width:600px){main{padding:36px 20px 56px}h1{font-size:22pt}.article-body{font-size:13.5pt}.author-footer{align-items:flex-start}}
.article-body{overflow-wrap:break-word;word-break:break-word}
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-inner">
    <span class="topbar-logo">BrainTaiwan</span>
    <a href="/">← 回首頁</a>
  </div>
</div>

<main>
  <span class="article-tag">${esc(a.tag)}</span>
  <h1>${esc(a.title)}</h1>
  <div class="article-meta">
    <div class="meta-avatar"><img src="/ian.jpg" alt="施懿恩" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"></div>
    <div>
      <div class="meta-name">施懿恩</div>
      <div>神經專科醫師 · ${DATE}</div>
    </div>
  </div>

  <div class="article-body">
${contentHtml}
  </div>

${seriesBox(related, activeIdx)}

  <div class="author-footer">
    <div class="af-avatar"><img src="/ian.jpg" alt="施懿恩" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"></div>
    <div>
      <div class="af-name">施懿恩</div>
      <div class="af-title">神經專科醫師</div>
      <div class="af-bio">專注於腦血管疾病與神經系統罕見病。希望用清楚的文字讓更多人理解自己的大腦與身體健康，因為好的醫學知識不該只留在學術圈。</div>
    </div>
  </div>

  <div class="back-link">
    <a href="/">← 返回所有文章</a>
  </div>
</main>

${SHARE}

<footer>
  © 2026 BrainTaiwan Media · 本文為衛教資訊，不構成個人醫療建議，如有症狀請就醫
</footer>

</body>
</html>`;
}

const parsedArticles = articles.map(article => {
  const src = fs.readFileSync(path.join(SRC, article.md), 'utf8');
  return { ...article, ...parse(src) };
});

parsedArticles.forEach((parsed, index) => {
  articles[index].title = parsed.title;
});

parsedArticles.forEach((parsed, index) => {
  const html = page(parsed, parsed.body, index);
  fs.writeFileSync(path.join(OUT, parsed.out), html, 'utf8');
  console.log('寫出', parsed.out, '—', parsed.title);
});

console.log('完成：營養食品科學 media 文章');
