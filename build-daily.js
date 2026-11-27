// Daily morning-brief builder — converts _src/<slug>.md to posts/<slug>.html
// Modelled on build-cardiac-media.js (teal Media template)
const fs = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '_src');
const OUT  = path.join(__dirname, 'posts');
const SITE = 'https://media.braintaiwan.com';
const DATE = '2026.11.27';
const SERIES = '動作障礙';

const article = {
  md:  '2026-11-27-essential-tremor-misdiagnosis-focused-ultrasound.md',
  out: '2026-11-27-essential-tremor-misdiagnosis-focused-ultrasound.html',
  title: '',
  desc: "十一月二十五日，中山醫學大學附設醫院把俗稱「神波刀」的磁振導航聚焦超音波攤在媒體面前：核磁共振即時影像導引下，許多道超音波穿過頭骨匯聚到大腦深處一點，靠升溫做出很小的破壞，病人全程清醒，目前在台灣自費。機器的準度講的是毫米，但手抖最容易出錯的一步在它開機之前——Jain 等人二○○六年把連續七十一位帶著原發性顫抖症診斷轉介進來的病人重看一遍，百分之三十七診斷被改掉，其中百分之十五其實是巴金森病、百分之八是肌張力不全。分辨的起點是看那隻手當時在做什麼：原發性顫抖是動作型與姿勢型，巴金森的典型顫抖是靜止型，兩者分別跑在小腦—視丘—運動皮質環路與基底核多巴胺迴路上。神波刀瞄的是視丘的 Vim；Elias 等人二○一六年在《新英格蘭醫學期刊》的試驗裡，七十六人以三比一分組，三個月後手部顫抖分數由十八點一降到九點六、兩組差八點三分，代價是步態不穩百分之三十六、感覺異常百分之三十八。Cosgrove 等人追到第五年仍維持約四成改善。台灣臨床估計約四十萬人受原發性顫抖症困擾，單側自費約六十五萬元。",
  tag: '動作障礙 · 時事',
};
const related = [
  { out: '2026-11-27-essential-tremor-misdiagnosis-focused-ultrasound.html', nav: '本篇', title: '「拿筷子、端水杯、扣鈕扣」——中山附醫前天把神波刀那套攤開，而手抖最容易出錯的一步，在機器開機之前' },
  { out: '2026-11-26-diagnostic-overshadowing-delirium-institution.html', nav: '精神症狀與神經', title: '「死者的鞋底藏著一封遺書」——蘆洲那兩間精神護理之家，和「他只是在想像」這句話在神經科的代價' },
  { out: '2026-11-25-medication-overuse-headache-painkiller-rebound.html', nav: '止痛藥與頭痛', title: '「止痛藥從每月幾顆吃到接近一百顆」——奇美醫院上週攤開的那個三十八歲個案，和止痛藥為什麼會反過來製造頭痛' },
  { out: '2026-11-24-temperature-swing-stroke-warning-value.html', nav: '氣溫與腦血管', title: '「清晨關西六點六度，台北十六點五度」——今天鋒面又到，而國衛院在一百一十萬筆中風急診裡找出的警戒值，量的不是幾度，是差幾度' },
  { out: '2026-11-22-backward-walking-fall-lucid-interval.html', nav: '跌倒與頭部外傷', title: '「起初她還能一手掩面坐在地上」——竹縣體育場那八分鐘，和倒退走為什麼不是把走路倒過來播' },
];

function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function inline(s){
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m,c)=>{ codes.push(c); return `\x00${codes.length-1}\x00`; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\x00(\d+)\x00/g, (m,i)=>`<code>${esc(codes[+i])}</code>`);
  return s;
}

function renderBlocks(lines){
  let html = '';
  let i = 0;
  while (i < lines.length){
    let line = lines[i];
    if (/^\s*$/.test(line)){ i++; continue; }
    if (/^---\s*$/.test(line)){ html += '<hr>\n'; i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))){
      const lvl = m[1].length;
      html += `<h${lvl}>${inline(m[2].trim())}</h${lvl}>\n`;
      i++; continue;
    }
    if (/^>/.test(line)){
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])){
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const raw = buf.join('\n');
      const cls = raw.includes('🩺') ? ' class="commentary"' : '';
      html += `<blockquote${cls}>\n${renderBlocks(buf)}</blockquote>\n`;
      continue;
    }
    if (line.includes('|') && i+1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i+1]) && lines[i+1].includes('-')){
      const rows = [];
      while (i < lines.length && lines[i].includes('|')){ rows.push(lines[i]); i++; }
      const cells = r => r.replace(/^\s*\|/,'').replace(/\|\s*$/,'').split('|').map(c=>c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      let t = '<table>\n<thead><tr>' + head.map(c=>`<th>${inline(c)}</th>`).join('') + '</tr></thead>\n<tbody>\n';
      for (const r of body){ t += '<tr>' + r.map(c=>`<td>${inline(c)}</td>`).join('') + '</tr>\n'; }
      t += '</tbody></table>\n';
      html += t; continue;
    }
    if (/^\d+\.\s+/.test(line)){
      let l = '<ol>\n';
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])){
        l += `<li>${inline(lines[i].replace(/^\d+\.\s+/,''))}</li>\n`; i++;
      }
      l += '</ol>\n'; html += l; continue;
    }
    if (/^[-*]\s+/.test(line)){
      let l = '<ul>\n';
      while (i < lines.length && /^[-*]\s+/.test(lines[i])){
        l += `<li>${inline(lines[i].replace(/^[-*]\s+/,''))}</li>\n`; i++;
      }
      l += '</ul>\n'; html += l; continue;
    }
    const p = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|>|---\s*$|\d+\.\s|[-*]\s)/.test(lines[i])
           && !(lines[i].includes('|') && i+1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i+1]))){
      p.push(lines[i]); i++;
    }
    if (p.length) html += `<p>${inline(p.join(' '))}</p>\n`;
  }
  return html;
}

function parse(src){
  let title = '';
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (fm){
    const t = fm[1].match(/title:\s*"?(.*?)"?\s*$/m);
    if (t) title = t[1];
    src = src.slice(fm[0].length);
  }
  const lines = src.split(/\r?\n/);
  const h1 = lines.findIndex(l => /^#\s+/.test(l));
  if (h1 !== -1) lines.splice(h1, 1);
  return { title, body: renderBlocks(lines) };
}

const SHARE = `<!-- bt-share: 閱讀時間 + 分享（自動注入） -->
<div class="bt-share">
  <span class="bt-rt" id="btReadingTime">⏱ 閱讀時間</span>
  <div class="bt-share-btns">
    <span class="bt-share-label">分享</span>
    <a class="bt-sh bt-fb" id="btFb" target="_blank" rel="noopener" aria-label="分享到 Facebook">f Facebook</a>
    <a class="bt-sh bt-line" id="btLine" target="_blank" rel="noopener" aria-label="分享到 LINE">LINE</a>
    <a class="bt-sh bt-x" id="btX" target="_blank" rel="noopener" aria-label="分享到 X">X</a>
    <button class="bt-sh bt-copy" id="btCopy" type="button">🔗 複製連結</button>
  </div>
</div>
<style>
.bt-share{max-width:720px;margin:0 auto 2.6rem;padding:1.15rem 1.5rem;display:flex;flex-wrap:wrap;gap:.8rem 1.3rem;align-items:center;justify-content:space-between;border-top:1px solid #d8d0c0;border-bottom:1px solid #d8d0c0}
.bt-rt{font-size:.92rem;color:#6f6a62;font-weight:600}
.bt-share-btns{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.bt-share-label{font-size:.85rem;color:#6f6a62;font-weight:700}
.bt-sh{display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 .85rem;border-radius:7px;font-size:.84rem;font-weight:700;text-decoration:none;cursor:pointer;border:none;color:#fff;line-height:1}
.bt-fb{background:#1877f2}.bt-line{background:#06c755}.bt-x{background:#111}.bt-copy{background:#2e7d32}
.bt-sh:hover{opacity:.85}
</style>
<script>
(function(){
  var url=location.href;
  var title=(document.title||'').replace(/\\s*[—|｜-].*$/,'').trim()||document.title;
  var c=document.querySelector('.article-body, .post-body, main, body');
  if(c){var n=(c.innerText||c.textContent||'').replace(/\\s+/g,'').length;var min=Math.max(1,Math.round(n/420));var rt=document.getElementById('btReadingTime');if(rt)rt.textContent='⏱ 閱讀時間約 '+min+' 分鐘';}
  var e=encodeURIComponent;
  var fb=document.getElementById('btFb');if(fb)fb.href='https://www.facebook.com/sharer/sharer.php?u='+e(url);
  var ln=document.getElementById('btLine');if(ln)ln.href='https://social-plugins.line.me/lineit/share?url='+e(url);
  var x=document.getElementById('btX');if(x)x.href='https://twitter.com/intent/tweet?url='+e(url)+'&text='+e(title);
  var cp=document.getElementById('btCopy');if(cp)cp.addEventListener('click',function(){if(navigator.clipboard){navigator.clipboard.writeText(url).then(function(){cp.textContent='✓ 已複製';setTimeout(function(){cp.textContent='🔗 複製連結';},1800);});}});
})();
</script>`;

function seriesBox(items, activeIdx){
  const links = items.map((n,i)=>
    `    <a href="${n.out}"${i===activeIdx?' class="cur"':''}>${n.nav}　${esc(n.title)}</a>`).join('\n');
  return `  <div class="series-box">
    <div class="sb-h">${SERIES} · 相關閱讀</div>
${links}
  </div>`;
}

function page(a, contentHtml){
  const url = `${SITE}/posts/${a.out}`;
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(a.title)} — BrainTaiwan</title>
<meta name="description" content="${esc(a.desc)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='88'%3E🧠%3C/text%3E%3C/svg%3E">
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
.article-tag{display:inline-block;background:#e0f2f1;color:#004d40;font-size:10pt;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:16px}
h1{font-size:25pt;font-weight:700;line-height:1.3;color:#0d1f1c;margin-bottom:16px}
.article-meta{display:flex;align-items:center;gap:8px;font-size:11pt;color:#888;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e8e8e8}
.meta-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#004d40,#00897b);display:flex;align-items:center;justify-content:center;font-size:14pt;color:#fff;font-weight:700}
.meta-name{font-weight:600;color:#444}
.article-body{font-size:14pt;line-height:1.9;color:#2a2a2a}
.article-body p{margin-bottom:20px}
.article-body h2{font-size:18pt;font-weight:700;color:#0d1f1c;margin:36px 0 14px;padding-left:14px;border-left:4px solid #00695c}
.article-body h3{font-size:15pt;font-weight:700;color:#00695c;margin:26px 0 10px}
.article-body strong{color:#0d1f1c}
.article-body em{font-style:italic;color:#555}
.article-body a{color:#00695c;text-decoration:none}
.article-body a:hover{text-decoration:underline}
.article-body hr{border:none;border-top:1px solid #e8e8e8;margin:32px 0}
.article-body ul,.article-body ol{margin:0 0 20px;padding-left:1.5em}
.article-body li{margin:.4em 0}
.article-body code{background:#eef6f4;padding:1px 6px;border-radius:5px;font-size:.9em}
.article-body table{width:100%;border-collapse:collapse;margin:24px 0;font-size:12.5pt;border:1px solid #e0e6e4;border-radius:8px;overflow:hidden}
.article-body th,.article-body td{padding:10px 13px;text-align:left;border-bottom:1px solid #eef2f1;vertical-align:top}
.article-body th{background:#00695c;color:#fff;font-weight:600}
.article-body tr:nth-child(even) td{background:#f3f8f6}
.article-body blockquote{margin:24px 0;padding:16px 20px;background:#eef6f4;border-left:4px solid #00695c;border-radius:0 8px 8px 0;color:#37474f;font-size:13pt}
.article-body blockquote p:last-child{margin-bottom:0}
.article-body blockquote.commentary{background:#fff7e8;border-left-color:#f5a623}
.article-body blockquote.commentary h3{color:#0d1f1c;margin-top:0}
.series-box{background:#fff;border:1px solid #e3e8e6;border-radius:12px;padding:18px 22px;margin:44px 0 0}
.series-box .sb-h{font-size:10pt;font-weight:800;letter-spacing:.08em;color:#00695c;text-transform:uppercase;margin-bottom:10px}
.series-box a{display:block;text-decoration:none;color:#455;font-size:11.5pt;padding:8px 0;border-top:1px solid #f0f3f2}
.series-box a:first-of-type{border-top:none}
.series-box a:hover{color:#00695c}
.series-box a.cur{color:#00695c;font-weight:700}
.author-footer{background:#fff;border-radius:10px;padding:24px;border:1px solid #ebebeb;display:flex;gap:16px;align-items:center;margin-top:32px}
.af-avatar{width:52px;height:52px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#004d40,#00897b);display:flex;align-items:center;justify-content:center;font-size:18pt;color:#fff;font-weight:700}
.af-name{font-size:12pt;font-weight:700;color:#0d1f1c}
.af-title{font-size:10pt;color:#00695c;font-weight:600;margin-top:2px}
.af-bio{font-size:10.5pt;color:#666;margin-top:6px;line-height:1.6}
.back-link{margin-top:36px}
.back-link a{color:#00695c;text-decoration:none;font-size:11pt;font-weight:600}
.back-link a:hover{text-decoration:underline}
footer{background:#0d1f1c;color:rgba(255,255,255,.4);text-align:center;padding:24px;font-size:10pt;margin-top:40px}
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

${seriesBox(related, 0)}

  <div class="author-footer">
    <div class="af-avatar"><img src="/ian.jpg" alt="施懿恩" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"></div>
    <div>
      <div class="af-name">施懿恩</div>
      <div class="af-title">神經專科醫師</div>
      <div class="af-bio">專注於腦血管疾病與神經系統罕見病。希望用清楚的文字讓更多人了解自己的大腦與身體健康，因為好的醫學知識不該只留在學術圈。</div>
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

const src = fs.readFileSync(path.join(SRC, article.md), 'utf8');
const parsed = { ...article, ...parse(src) };
const html = page(parsed, parsed.body);
fs.writeFileSync(path.join(OUT, parsed.out), html, 'utf8');
console.log('寫出', parsed.out, '—', parsed.title);
console.log(`完成：每日晨報 ${DATE} ${article.tag}`);
