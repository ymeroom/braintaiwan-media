const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const MARKER = '<!-- bt-subscribe-box -->';

const box = `${MARKER}
<section class="bt-subscribe-box" aria-label="訂閱 BrainTaiwan 神經健康信">
  <div class="bt-subscribe-kicker">BrainTaiwan Newsletter</div>
  <h2>覺得這篇有幫助？</h2>
  <p>訂閱 BrainTaiwan 神經健康信，每週收到神經科醫師整理的腦健康提醒、急症警訊與醫學新知。</p>
  <a class="bt-subscribe-btn" href="/subscribe.html">訂閱神經健康信</a>
</section>
<style>
.bt-subscribe-box{background:#fff;border:1px solid #dfe8e5;border-left:4px solid #00897b;border-radius:10px;padding:24px 26px;margin:42px 0 10px;box-shadow:0 8px 22px rgba(0,77,64,.06)}
.bt-subscribe-kicker{font-size:8pt;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#00695c;margin-bottom:8px}
.bt-subscribe-box h2{font-size:17pt;line-height:1.35;color:#0d1f1c;margin:0 0 10px;padding:0;border:0}
.bt-subscribe-box p{font-size:11pt;line-height:1.75;color:#4f5f5b;margin:0 0 16px}
.bt-subscribe-btn{display:inline-flex;align-items:center;justify-content:center;background:#00695c;color:#fff!important;text-decoration:none;border-radius:7px;padding:11px 18px;font-size:10pt;font-weight:800}
.bt-subscribe-btn:hover{background:#004d40;text-decoration:none!important}
</style>`;

function inject(html, file) {
  if (html.includes(MARKER)) return html;
  const targets = [
    /\n\s*<div class="author-footer">/,
    /\n\s*<div class="back-link">/,
    /\n<\/main>/,
  ];
  for (const target of targets) {
    const match = html.match(target);
    if (match) {
      return html.slice(0, match.index) + '\n\n' + box + html.slice(match.index);
    }
  }
  throw new Error(`No insertion point found in ${file}`);
}

let changed = 0;
for (const entry of fs.readdirSync(POSTS_DIR)) {
  if (!entry.endsWith('.html') || entry.startsWith('_')) continue;
  const file = path.join(POSTS_DIR, entry);
  const before = fs.readFileSync(file, 'utf8');
  const after = inject(before, entry);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed += 1;
  }
}

console.log(`Injected subscription box into ${changed} post(s).`);
