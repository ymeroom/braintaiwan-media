#!/usr/bin/env node
// check-citations.js — 參考來源完整性檢查
//
// 目的：確保引用的醫學期刊論文有完整 citation，而不是只寫期刊名 + 標題。
//
// 期刊論文（學術來源）必備欄位：
//   作者、標題、期刊名（斜體 *...*）、年份、卷(期):頁碼、DOI 或 PMID
//   範例：
//   - Solomon T, Vaughn DW. "Pathogenesis and clinical features of Japanese
//     encephalitis." *New England Journal of Medicine*, 2004;351(4):370–378.
//     DOI: 10.1056/NEJMra020092
//
// 機關、新聞、指引等非期刊來源：必須有機構名 + 標題 +（年月）日期。
//   範例：
//   - 衛生福利部疾病管制署，〈國內出現今年首例日本腦炎死亡病例〉，2026 年 7 月 28 日
//
// 用法：
//   node check-citations.js                 檢查 _src 內日期最新的一篇
//   node check-citations.js _src/x.md ...   檢查指定檔案
//   node check-citations.js --all           稽核所有含日期的文章（會列出舊文欠債）
//   node check-citations.js --quiet         只輸出錯誤

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '_src');

// 判定「這是一筆學術引用」的訊號
const JOURNAL_HINTS = [
  'lancet', 'jama', 'nature', 'science', 'nejm', 'new england journal', 'bmj',
  'neurology', 'stroke', 'brain', 'circulation', 'plos', 'ploS', 'frontiers',
  'bmc', 'alzheimer', 'journal', 'annals', 'cell ', 'epilepsia', 'radiology',
  'hypertension', 'diabetes', 'pediatrics', 'sleep', 'neuroscience', 'cochrane',
  'jour.', 'eur heart', 'european heart', 'clinical infectious',
];
const LOCATOR_RE = /(doi\s*[:：]|10\.\d{4,9}\/|pmid\s*[:：]?\s*\d{5,}|pmc\d{5,}|nct\d{6,})/i;
const YEAR_RE = /\b(19|20)\d{2}\b/;
const ITALIC_JOURNAL_RE = /\*[^*]{3,}\*/;
const TITLE_RE = /["“”「」『』〈〉《》]/;
// 作者：`Surname AB,` / `Surname A. ` / `... et al.` / 團體作者 Collaborators / Group
const AUTHOR_RE = /(et al\.|collaborat|study group|\bgroup\b|^[A-Z][A-Za-zÀ-ſ'’-]{1,}\s+[A-Z]{1,3}[,.]|^[A-Z][A-Za-zÀ-ſ'’-]{1,},\s+[A-Z]\.)/;
// 卷(期):頁 或 Vol. / pp.
const VOLPAGE_RE = /(\b\d{4}\s*[;；]\s*\d+|vol\.?\s*\d+|volume\s+\d+|pp?\.\s*\d+|\b\d+\s*\(\d+[^)]*\)\s*[,:：]\s*\d)/i;
// 資料庫／聚合網站不能當期刊名
const AGGREGATORS = ['pubmed', 'pmc/ncbi', 'ncbi', 'sciencedirect', 'sciencedaily',
  'researchgate', 'oxford academic', 'medscape', 'neurologylive', '.com', '.org 網站'];

// 來源種類：registry（試驗登錄）、guideline（臨床指引）、academic（期刊論文）、general（機關／新聞）
function classifySource(text) {
  const t = text.toLowerCase();
  if (/nct\d{6,}/i.test(t) || t.includes('clinicaltrials.gov')) return 'registry';
  if (/(guideline|指引|治療準則|consensus|共識|建議書)/i.test(text)) return 'guideline';
  if (LOCATOR_RE.test(t)) return 'academic';
  if (JOURNAL_HINTS.some(h => t.includes(h))) return 'academic';
  // 純中文機關／新聞來源不算學術引用
  return 'general';
}

function extractSources(md) {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex(l => /^##\s*參考來源/.test(l));
  if (start === -1) return null;
  const bullets = [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { end = i; break; }
    if (/^[-*]\s+/.test(lines[i])) {
      // 支援換行續接的長引用
      let text = lines[i].replace(/^[-*]\s+/, '').trim();
      let j = i + 1;
      while (j < lines.length && /^\s{2,}\S/.test(lines[j])) { text += ' ' + lines[j].trim(); j++; }
      bullets.push({ line: i + 1, text });
      i = j - 1;
    }
  }
  const closerIdx = lines.findIndex(l => /🩺\s*神經專科/.test(l));
  return { startLine: start + 1, endLine: end, bullets, closerLine: closerIdx + 1 };
}

function checkBullet(b) {
  const errs = [];
  const warns = [];
  const t = b.text;

  if (t.length < 10) {
    errs.push('引用過短，無法判讀來源');
    return { errs, warns, academic: false };
  }

  const kind = classifySource(t);
  const academic = kind === 'academic';

  if (kind === 'registry') {
    if (!/nct\d{6,}/i.test(t)) errs.push('試驗登錄來源缺 NCT 編號');
    if (!TITLE_RE.test(t)) errs.push('缺試驗標題（需用引號框住）');
    if (!YEAR_RE.test(t)) errs.push('缺年份');
  } else if (kind === 'guideline') {
    if (!/[A-Za-z一-鿿]{2,}/.test(t)) errs.push('缺發布機構');
    if (!TITLE_RE.test(t)) errs.push('缺指引全名（需用引號或〈〉框住）');
    if (!YEAR_RE.test(t)) errs.push('缺發布年份');
    if (!LOCATOR_RE.test(t) && !/https?:\/\//.test(t)) {
      warns.push('建議補上刊登期刊的 DOI 或指引原文連結');
    }
  } else if (academic) {
    if (!AUTHOR_RE.test(t)) errs.push('缺作者（需 `Surname AB, Surname CD` 或 `Surname AB, et al.`）');
    if (!TITLE_RE.test(t)) errs.push('缺論文標題（需用引號「"…"」框住）');
    if (!ITALIC_JOURNAL_RE.test(t)) errs.push('缺期刊名（需以 *斜體* 標示，例如 *Lancet Neurology*）');
    if (!YEAR_RE.test(t)) errs.push('缺出版年份');
    if (!LOCATOR_RE.test(t)) errs.push('缺 DOI 或 PMID／PMC／NCT 識別碼');
    if (!VOLPAGE_RE.test(t)) warns.push('缺卷(期):頁碼（線上優先發表可省略，其餘請補上）');

    const low = t.toLowerCase();
    const agg = AGGREGATORS.find(a => low.includes(a));
    if (agg && !ITALIC_JOURNAL_RE.test(t)) {
      warns.push(`以資料庫／網站（${agg}）代替期刊名，請改寫為真正的期刊全名`);
    }
  } else {
    if (!YEAR_RE.test(t)) errs.push('非期刊來源缺年份（機關／新聞來源需註明發布日期）');
    if (!TITLE_RE.test(t) && !/[，,]/.test(t)) warns.push('建議格式：機構名，〈標題〉，YYYY 年 M 月 D 日');
  }

  return { errs, warns, academic };
}

function checkFile(file, opts) {
  const md = fs.readFileSync(file, 'utf8');
  const rel = path.relative(__dirname, file);
  const out = [];
  let errCount = 0, warnCount = 0;

  const sec = extractSources(md);
  if (!sec) {
    out.push(`  ❌ 找不到 "## 參考來源" 區塊`);
    return { rel, out, errCount: 1, warnCount: 0, academicCount: 0 };
  }
  if (sec.bullets.length === 0) {
    out.push('  ❌ 參考來源區塊沒有任何 `- ` 條目');
    return { rel, out, errCount: 1, warnCount: 0, academicCount: 0 };
  }
  if (sec.bullets.length < 3) {
    out.push(`  ⚠️  只有 ${sec.bullets.length} 筆來源，建議至少 3 筆`);
    warnCount++;
  }
  if (sec.closerLine && sec.closerLine > sec.startLine) {
    out.push('  ⚠️  參考來源出現在 🩺 醫師觀察之前；標準順序是「結尾觀察 → 參考來源 → 免責聲明」');
    warnCount++;
  }

  let academicCount = 0;
  for (const b of sec.bullets) {
    const r = checkBullet(b);
    if (r.academic) academicCount++;
    const short = b.text.length > 60 ? b.text.slice(0, 60) + '…' : b.text;
    for (const e of r.errs) {
      out.push(`  ❌ L${b.line} ${e}`);
      out.push(`       ${short}`);
      errCount++;
    }
    for (const w of r.warns) {
      out.push(`  ⚠️  L${b.line} ${w}`);
      if (!opts.quiet) out.push(`       ${short}`);
      warnCount++;
    }
  }

  if (academicCount === 0) {
    out.push('  ⚠️  沒有任何期刊論文引用；文中若出現研究數據，必須引用原始論文而非新聞轉述');
    warnCount++;
  }

  return { rel, out, errCount, warnCount, academicCount };
}

// ----------------------------------------------------------------------- main
const args = process.argv.slice(2);
const opts = { quiet: args.includes('--quiet') };
let files = args.filter(a => !a.startsWith('--'));

if (args.includes('--all')) {
  files = fs.readdirSync(SRC)
    .filter(f => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(f))
    .sort()
    .map(f => path.join(SRC, f));
} else if (files.length === 0) {
  const dated = fs.readdirSync(SRC).filter(f => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(f)).sort();
  if (dated.length === 0) { console.error('_src 內找不到日期開頭的文章'); process.exit(2); }
  files = [path.join(SRC, dated[dated.length - 1])];
} else {
  files = files.map(f => path.resolve(f));
}

let totalErr = 0, totalWarn = 0;
const results = files.map(f => checkFile(f, opts));

for (const r of results) {
  if (r.errCount === 0 && r.warnCount === 0) {
    if (!opts.quiet) console.log(`✅ ${r.rel} — 參考來源完整（學術引用 ${r.academicCount} 筆）`);
  } else {
    if (opts.quiet && r.errCount === 0) { totalWarn += r.warnCount; continue; }
    console.log(`${r.errCount ? '❌' : '⚠️ '} ${r.rel}`);
    for (const line of r.out) {
      if (opts.quiet && line.trim().startsWith('⚠')) continue;
      console.log(line);
    }
  }
  totalErr += r.errCount;
  totalWarn += r.warnCount;
}

console.log('');
console.log(`檢查 ${results.length} 篇：錯誤 ${totalErr}、警告 ${totalWarn}`);
if (totalErr) {
  console.log('');
  console.log('期刊論文正確格式：');
  console.log('- Solomon T, Vaughn DW. "Pathogenesis and clinical features of Japanese encephalitis." ' +
              '*New England Journal of Medicine*, 2004;351(4):370–378. DOI: 10.1056/NEJMra020092');
  console.log('機關／新聞來源正確格式：');
  console.log('- 衛生福利部疾病管制署，〈國內出現今年首例日本腦炎死亡病例〉，2026 年 7 月 28 日');
}
process.exit(totalErr ? 1 : 0);
