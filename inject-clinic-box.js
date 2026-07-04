const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const MARKER = '<!-- bt-clinic-box -->';
const SUBSCRIBE_MARKER = '<!-- bt-subscribe-box -->';

const box = `${MARKER}
<section class="bt-clinic-box" aria-label="施懿恩醫師門診資訊">
  <div class="bt-clinic-kicker">Outpatient Clinic</div>
  <h2>想當面請醫師評估？</h2>
  <p>本站文章由神經內科<strong>施懿恩醫師</strong>撰寫。門診：清泉醫院 神經內科（臺中大雅），每週一、週四看診。</p>
  <a class="bt-clinic-btn" href="https://braintaiwan.com/clinic.html?utm_source=media&amp;utm_medium=article&amp;utm_campaign=clinic-box">門診時段與掛號</a>
</section>
<style>
.bt-clinic-box{background:#fff;border:1px solid #dce4f0;border-left:4px solid #1565c0;border-radius:10px;padding:24px 26px;margin:42px 0 10px;box-shadow:0 8px 22px rgba(15,33,66,.06)}
.bt-clinic-kicker{font-size:8pt;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#1565c0;margin-bottom:8px}
.bt-clinic-box h2{font-size:17pt;line-height:1.35;color:#101c30;margin:0 0 10px;padding:0;border:0}
.bt-clinic-box p{font-size:11pt;line-height:1.75;color:#4c5871;margin:0 0 16px}
.bt-clinic-btn{display:inline-flex;align-items:center;justify-content:center;background:#1565c0;color:#fff!important;text-decoration:none;border-radius:7px;padding:11px 18px;font-size:10pt;font-weight:800}
.bt-clinic-btn:hover{background:#0f2142;text-decoration:none!important}
</style>`;

function inject(html, file) {
  if (html.includes(MARKER)) return html;
  // Clinic box goes directly above the subscribe box so the reading order is
  // narrative -> clinic -> subscribe -> author footer.
  const subscribeAt = html.indexOf(SUBSCRIBE_MARKER);
  if (subscribeAt !== -1) {
    return html.slice(0, subscribeAt) + box + '\n\n' + html.slice(subscribeAt);
  }
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

console.log(`Injected clinic box into ${changed} post(s).`);
