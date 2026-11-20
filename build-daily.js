// Daily morning-brief builder — converts _src/<slug>.md to posts/<slug>.html
// Modelled on build-cardiac-media.js (teal Media template)
const fs = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '_src');
const OUT  = path.join(__dirname, 'posts');
const SITE = 'https://media.braintaiwan.com';
const DATE = '2026.11.20';
const SERIES = '復健人力與脊椎神經';

const article = {
  md:  '2026-11-20-physical-therapist-exodus-spine-nerve-rehab.md',
  out: '2026-11-20-physical-therapist-exodus-spine-nerve-rehab.html',
  title: '',
  desc: "台大醫院北護分院的物理治療室缺十六名治療師，前天的報導說該院創院二十二年以來第一次不再「隨到隨做」——十一月九日起開放預約、二十三日起照預約表執行治療；院方招三個人，碩士學歷最高年薪開到九十一萬元，履歷掛零，醫療部主任韓德生說離職的人去了自費物理治療所、長照單位和復健科診所，同一天衛福部長石崇良回應點值已提升、各項給付在調整，希望醫院營造好職場讓治療師回流。全台物理治療所從二○一七年的一百五十五家成長為去年的五百六十二家，公會全聯會估今年破六百家，其中與健保特約的只有三十一家；理事長陳志明說健保復健給付二十年沒調整，自費院所治療師起薪六萬起跳、每月薪資差距至少一萬元，自費一次收一千五到三千五百元——供給沒有消失，它換了一個付費窗口。從神經科看過去，排不到的那件事正是指引寫在第一線的處方：腰椎神經根壓迫的坐骨神經痛、頸椎神經根症的手麻與無力、周邊神經損傷後的動作再訓練，處方欄寫的不是一顆藥，是一段需要有人盯著做的訓練。美國內科醫學會二○一七年的下背痛指引把慢性下背痛的第一線放在運動治療、多專科復健、針灸與正念減壓，藥物排在後面；《刺胳針》二○一八年系列論文則指出下背痛已是全球失能原因第一位，而真實醫療行為裡影像、鴉片類止痛藥、注射和手術被過度使用，第一線治療反而用得不夠。等不到的人會往哪裡去，這題有數字：二○一二年《Spine》分析三萬兩千多名因下背痛初次就診的美國病人，十四天內接受物理治療的那一組，後續進階影像、額外門診、腰椎注射與脊椎手術使用率都比較低。而另一條路的終點未必更好——SPORT 試驗五百零一名腰椎椎間盤突出、神經根症狀超過六週的手術候選人隨機分到開刀或非手術，兩組兩年都明顯進步、意向治療分析差距小且未達統計顯著；二○一五年《內科學年鑑》把一百六十九名腰椎椎管狹窄的手術候選人隨機分到減壓手術或物理治療，兩年後身體功能分數只差零點九分，但物理治療組有五成七的人後來還是去開了刀。",
  tag: '復健人力與脊椎神經 · 時事',
};
const related = [
  { out: '2026-11-20-physical-therapist-exodus-spine-nerve-rehab.html', nav: '本篇', title: '「創院二十二年來第一次不能隨到隨做」——台大分院的復健室前天改成預約制，而指引上的第一線處方正是那件排不到的事' },
  { out: '2026-11-19-plexiform-neurofibroma-mek-nhi-age-limit.html', nav: '神經腫瘤與給付', title: '「原先估五十人，現在超過七十個孩子在用」——癌藥基金首案昨天攤出成績，而給付那一行寫的是「未滿十八歲」' },
  { out: '2026-11-18-nmosd-relapse-irreversible-nhi-threshold.html', nav: '神經免疫與給付', title: '「以為病情穩定，第三次發作卻癱瘓」——長庚醫師上週把這個案子攤開，而健保那道門檻數的是「兩年內兩次復發」' },
  { out: '2026-11-17-influenza-encephalopathy-ane-vaccine.html', nav: '流感與腦病變', title: '「Novavax 只剩六萬八千劑」——疾管署昨天說接種人次暴增三成，而流感重症裡九成七沒打疫苗，最凶的那一刀落在視丘' },
  { out: '2026-11-16-cold-air-mass-temperature-swing-stroke.html', nav: '低溫與中風', title: '「週三轉冷，低溫下探十一度」——首波大陸冷氣團今天進了預報，而國衛院那一百一十萬筆急診資料說，扣分的不是最低溫那一格' },
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
