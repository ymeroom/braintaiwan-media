# 腦血管危險因子 media 三篇系列（cvrf）實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 media.braintaiwan.com 上線三篇大眾衛教文，把血壓與膽固醇放進神經科視角（終點是腦而非心臟），所有數字經 claim-gate 釘回指引源文。

**Architecture:** 源 PDF → `pypdf` 抽章節 → Mistral OCR 轉 markdown 源文 → 主 agent 直接起草 `_src/<slug>.md` → 每篇建 ledger JSON 交 `gate.js` 判定 → `build-cvrf-media.js` 產生 `posts/<slug>.html` → 四個 post-build 腳本補回 SEO schema 與注入框 → 手動加 index.html 卡片 → 預覽後由用戶決定是否 push。

**Tech Stack:** Node.js（build 與 enhancer 腳本）、Python 3 + `pypdf` 6.14.2 + `requests`（PDF 抽頁與 OCR）、Mistral OCR API（`mistral-ocr-4-0`）

## Global Constraints

- 設計依據：`D:\claudecode\braintaiwan-media\docs\superpowers\specs\2026-07-21-cvrf-media-series-design.md`
- 系列代號 `cvrf`；三個 slug 固定為 `bp-130-brain`、`ldl-brain-target`、`statin-bp-drug-fear`
- 源文一律用 Mistral OCR，**禁用 pdftotext**（`·` 小數點與 `≥`／`≤` 會被靜默吞掉）
- 起草由主 agent 本人完成，**不外包 codex、不用 subagent 逐篇跑**
- 文體：具體場景開場＋一個刺眼的數字，再進機轉；三不原則（不開場白、不條列、不呼籲行動）
- 結尾固定為 `> ### 🩺 神經專科 施懿恩醫師觀察` blockquote，且**必須收在觀察或開放問題**，不得是總結、行動呼籲或勵志結語
- 結尾之後接 `## 參考來源` 項目清單，再接斜體免責聲明行
- 凡「台灣的數字」必須取自台灣指引，不得以美國數據冒充
- 每次執行任何 `build-*-media.js` 之後，**必須**依序跑 `inject-subscribe-box.js`、`inject-clinic-box.js`、`enhance-article-seo.js`、`seo-build.js`，否則重建的頁面會靜默失去 SEO schema 與注入框
- 修改任何 `.js` 之後執行 `node --check <file>`
- `braintaiwan-media` 工作區現有 46 個檔案顯示已修改但 `git diff` 為空（換行符差異）。**每次 commit 只 `git add` 本計劃明確列出的檔案**，絕不使用 `git add -A` 或 `git add .`
- **不得 push、不得部署、不得發 FB**。全部完成後交用戶預覽，取得明確同意才推送
- 所有公開文字發佈前對照 `D:\claudecode\BRAND_STYLE_GUIDE.md`

---

## File Structure

**新建（源文與查證，位於 `D:\claudecode\cvrf-articles\`，非 git repo）**

| 檔案 | 責任 |
| --- | --- |
| `_aha2024-prevention.pdf` | 2024 AHA/ASA 一級中風預防指引原始 PDF |
| `_tw-htn2022.pdf` | 2022 台灣高血壓治療指引原始 PDF |
| `_tw-lipid2025.pdf` | 2025 台灣血脂管理臨床路徑共識原始 PDF |
| `extract-pages.py` | 用 pypdf 從大 PDF 抽出指定頁範圍成小 PDF |
| `_slice-*.pdf` | 抽出的章節小 PDF（OCR 的實際輸入） |
| `_source-bp.md` | 血壓相關章節 OCR 結果 |
| `_source-lipid.md` | 血脂相關章節 OCR 結果 |
| `gate.js` | claim-gate 執行器，讀 ledger JSON、呼叫既有純函式、非零 exit code 代表未過 |
| `_ledger-<slug>.json` | 每篇的斷言帳本 |

**新建（站內，位於 `D:\claudecode\braintaiwan-media\`）**

| 檔案 | 責任 |
| --- | --- |
| `_src/bp-130-brain.md` | 第一篇原始 markdown |
| `_src/ldl-brain-target.md` | 第二篇原始 markdown |
| `_src/statin-bp-drug-fear.md` | 第三篇原始 markdown |
| `build-cvrf-media.js` | 本系列專屬 build 腳本，只產生這三篇 |

**修改**

| 檔案 | 修改內容 |
| --- | --- |
| `index.html` | 於第 356 行的 `resistant-htn-rdn` 卡片前插入三張新卡片 |
| `posts/*.html`、`sitemap.xml`、`robots.txt` | 由腳本產生，不手動編輯 |

---

### Task 1: 取得源文並轉成可查證的 markdown

**Files:**
- Create: `D:\claudecode\cvrf-articles\extract-pages.py`
- Create: `D:\claudecode\cvrf-articles\_aha2024-prevention.pdf`、`_tw-htn2022.pdf`、`_tw-lipid2025.pdf`
- Create: `D:\claudecode\cvrf-articles\_source-bp.md`、`_source-lipid.md`

**Interfaces:**
- Consumes: `D:\claudecode\tools\mistral-ocr.py`（CLI：`python mistral-ocr.py <input.pdf> [-o output.md]`，需環境變數 `MISTRAL_API_KEY`，Windows 下會自動從 User-scope 讀取）
- Produces: `_source-bp.md` 與 `_source-lipid.md`，含頁次分隔標記，供 Task 3–5 的 ledger 逐條回查

- [ ] **Step 1: 建立目錄並下載三份 PDF**

```bash
mkdir -p /d/claudecode/cvrf-articles
cd /d/claudecode/cvrf-articles
curl -L -o _tw-htn2022.pdf "https://www.tsoc.org.tw/upload/journal/1/20220531/acs-38-225.pdf"
```

AHA 與 PMC 兩份可能擋 curl。若 `curl` 取回的不是 PDF（用下一步驗證），改用 WebFetch 取得真實 PDF 連結，或請用戶手動下載後放進本目錄。**不得改用二手來源或摘要文章代替原始指引。**

- [ ] **Step 2: 驗證三份 PDF 確實是 PDF 且頁數合理**

```bash
cd /d/claudecode/cvrf-articles
for f in _aha2024-prevention.pdf _tw-htn2022.pdf _tw-lipid2025.pdf; do
  printf "%s: " "$f"; head -c 5 "$f"; printf "  pages="
  python -c "import sys,pypdf;print(len(pypdf.PdfReader(sys.argv[1]).pages))" "$f"
done
```

Expected: 每行開頭是 `%PDF-`；`_aha2024-prevention.pdf` 約 81 頁、`_tw-htn2022.pdf` 約 101 頁、`_tw-lipid2025.pdf` 數十頁。若開頭是 `<html`，代表抓到的是網頁不是 PDF，回 Step 1 處理。

- [ ] **Step 3: 寫抽頁腳本**

`mistral-ocr.py` 沒有頁數參數，只吃整份 PDF，所以必須先抽頁。

```python
#!/usr/bin/env python3
"""Extract a 1-based inclusive page range from a PDF into a smaller PDF.

Why: tools/mistral-ocr.py has no page-range option, and OCRing 200 pages to
quote a handful of numbers is waste. Slice first, then OCR the slice.

Usage:
    python extract-pages.py <input.pdf> <first> <last> <output.pdf>
"""

import sys

from pypdf import PdfReader, PdfWriter


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    src, first, last, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    reader = PdfReader(src)
    total = len(reader.pages)
    if not 1 <= first <= last <= total:
        sys.exit(f"page range {first}-{last} outside 1-{total}")
    writer = PdfWriter()
    for i in range(first - 1, last):
        writer.add_page(reader.pages[i])
    with open(out, "wb") as fh:
        writer.write(fh)
    print(f"{out}: {last - first + 1} pages from {src}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 驗證抽頁腳本會拒絕壞範圍**

```bash
cd /d/claudecode/cvrf-articles
python extract-pages.py _tw-htn2022.pdf 5 3 _discard.pdf; echo "exit=$?"
python extract-pages.py _tw-htn2022.pdf 1 99999 _discard.pdf; echo "exit=$?"
test -f _discard.pdf && echo "BUG: 壞範圍不該產生檔案" || echo "ok: 未產生檔案"
```

Expected: 兩次都印出 `page range ... outside ...` 且 `exit=1`。這是防呆——章節頁碼是人工從目錄讀出來的，抄錯很容易。

- [ ] **Step 5: 定位所需章節的實際頁碼**

三份 PDF 的目錄各讀一次，記下下列章節的**PDF 實體頁碼**（不是期刊頁碼，兩者通常有偏移）：

- `_aha2024-prevention.pdf`：血壓／高血壓專節、血脂／lipid 專節
- `_tw-htn2022.pdf`：高血壓定義與診斷閾值、居家血壓量測（722）、目標血壓值
- `_tw-lipid2025.pdf`：風險分層、LDL-C 目標值、臨床路徑圖表

用下列指令逐頁抽第一頁文字定位（此處僅用於**找頁碼**，不作為引用來源）：

```bash
cd /d/claudecode/cvrf-articles
python -c "
import pypdf,sys
r=pypdf.PdfReader(sys.argv[1])
for i,p in enumerate(r.pages[:40],1):
    t=(p.extract_text() or '')[:80].replace('\n',' ')
    print(i,'|',t)
" _tw-htn2022.pdf
```

把定出的頁碼寫進本檔案 Step 6 的指令中再執行。

- [ ] **Step 6: 抽出章節小 PDF**

以 Step 5 定出的頁碼取代下列 `<first>`／`<last>`：

```bash
cd /d/claudecode/cvrf-articles
python extract-pages.py _aha2024-prevention.pdf <first> <last> _slice-aha-bp.pdf
python extract-pages.py _aha2024-prevention.pdf <first> <last> _slice-aha-lipid.pdf
python extract-pages.py _tw-htn2022.pdf <first> <last> _slice-tw-htn.pdf
python extract-pages.py _tw-lipid2025.pdf <first> <last> _slice-tw-lipid.pdf
```

四份小 PDF 合計應在 40–50 頁之譜。若超過 70 頁，代表章節範圍抓太寬，回 Step 5 收窄。

- [ ] **Step 7: 跑 Mistral OCR**

```bash
cd /d/claudecode/cvrf-articles
python /d/claudecode/tools/mistral-ocr.py _slice-aha-bp.pdf -o _ocr-aha-bp.md
python /d/claudecode/tools/mistral-ocr.py _slice-tw-htn.pdf -o _ocr-tw-htn.md
python /d/claudecode/tools/mistral-ocr.py _slice-aha-lipid.pdf -o _ocr-aha-lipid.md
python /d/claudecode/tools/mistral-ocr.py _slice-tw-lipid.pdf -o _ocr-tw-lipid.md
cat _ocr-aha-bp.md _ocr-tw-htn.md > _source-bp.md
cat _ocr-aha-lipid.md _ocr-tw-lipid.md > _source-lipid.md
```

若指令因 `MISTRAL_API_KEY is not set` 中止，先確認 Windows User-scope 環境變數存在，再重跑。

- [ ] **Step 8: 驗證符號存活**

這是本任務的關鍵驗收步驟——OCR 失敗的模式是符號被吃掉而句子照樣通順。

```bash
cd /d/claudecode/cvrf-articles
grep -c "≥\|≤" _source-bp.md _source-lipid.md
grep -n "130/80\|722" _source-bp.md | head -5
grep -n "LDL" _source-lipid.md | head -5
```

Expected: `≥`／`≤` 在兩檔中都應**大於 0**（血壓與血脂指引不可能不含不等號）。若為 0，代表 OCR 有問題，不得繼續——改用 `--model` 重跑或把該頁另外轉圖目視核對。

另外挑 2 個含數字的句子，開啟原 PDF 對應頁**目視確認**數值與不等號方向一致。

- [ ] **Step 9: 記錄章節頁碼對照**

在 `_source-bp.md` 與 `_source-lipid.md` 檔首各加一段 HTML 註解，寫明每段來自哪份指引的哪些頁：

```markdown
<!-- 來源對照
_ocr-aha-bp.md   ← _aha2024-prevention.pdf p.<first>-<last>（2024 AHA/ASA 一級中風預防指引，血壓節）
_ocr-tw-htn.md   ← _tw-htn2022.pdf p.<first>-<last>（2022 台灣高血壓治療指引）
-->
```

沒有這段對照，之後 ledger 裡的頁碼就無法回查。

- [ ] **Step 10: 不 commit**

`cvrf-articles/` 位於 `D:\claudecode\` 下但不屬於任何 git repo，是源文工作區，不需提交。確認沒有任何檔案被寫進 `braintaiwan-media`：

```bash
cd /d/claudecode/braintaiwan-media && git status --porcelain | grep -v "^ M posts/\|^ M sitemap.xml" | head
```

Expected: 無輸出（除了先前既有的換行符差異）。

---

### Task 2: 建立 claim-gate 執行器

**Files:**
- Create: `D:\claudecode\cvrf-articles\gate.js`
- Create: `D:\claudecode\cvrf-articles\_ledger-example.json`（測試用，驗證完即刪）

**Interfaces:**
- Consumes: `D:\claudecode\braintaiwan-md\lib\gate.js` 匯出的 `{ HIGH_RISK, evaluateGate }`。`evaluateGate(ledgers, opts)` 吃 `[{article, claims:[{sentence, claimType, classification}]}]`，回傳 `{pass, unverified, blockers}`。`HIGH_RISK` 為 `['dose','percent','cutoff','criterion']`。分類值為 `SUPPORTED`／`NOT_FOUND`／`CONTRADICTED`
- Produces: 指令 `node gate.js _ledger-<slug>.json`，通過時 exit 0、未通過時 exit 1 並列出 blockers。Task 3–5 各自呼叫

- [ ] **Step 1: 寫會失敗的測試用 ledger**

`_ledger-example.json` 刻意放一條與源文矛盾的斷言與一條高風險未找到的斷言：

```json
{
  "article": "example",
  "claims": [
    { "sentence": "台灣高血壓定義為 130/80 mmHg。", "claimType": "cutoff", "classification": "SUPPORTED", "source": "_source-bp.md:120" },
    { "sentence": "收縮壓每升高 20 mmHg，中風風險增加三倍。", "claimType": "percent", "classification": "CONTRADICTED", "source": "_source-bp.md:88" },
    { "sentence": "statin 應於睡前服用。", "claimType": "dose", "classification": "NOT_FOUND", "source": "" }
  ]
}
```

- [ ] **Step 2: 執行以確認會失敗（此時腳本尚不存在）**

Run: `cd /d/claudecode/cvrf-articles && node gate.js _ledger-example.json`
Expected: FAIL — `Cannot find module ... gate.js`

- [ ] **Step 3: 寫執行器**

```javascript
#!/usr/bin/env node
// claim-gate runner for the cvrf media series.
// Reuses the pure decision function from the MD-site pipeline rather than
// re-implementing it, so both pipelines block on the same rules.
const fs = require('fs');
const path = require('path');

const GATE = path.join(__dirname, '..', 'braintaiwan-md', 'lib', 'gate.js');
if (!fs.existsSync(GATE)) {
  console.error(`找不到 ${GATE} — 確認 braintaiwan-md 與 cvrf-articles 同在 D:\\claudecode 下`);
  process.exit(2);
}
const { evaluateGate } = require(GATE);

const files = process.argv.slice(2);
if (!files.length) {
  console.error('用法：node gate.js <ledger.json> [ledger2.json ...]');
  process.exit(2);
}

const ledgers = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const total = ledgers.reduce((n, lg) => n + lg.claims.length, 0);
const supported = ledgers.reduce(
  (n, lg) => n + lg.claims.filter(c => c.classification === 'SUPPORTED').length, 0);

const { pass, blockers } = evaluateGate(ledgers);

console.log(`斷言 ${supported}/${total} SUPPORTED`);
for (const b of blockers) {
  console.log(`  ✗ [${b.article}] ${b.claimType} — ${b.reason}`);
  console.log(`     ${b.sentence}`);
}
console.log(pass ? '閘門通過' : `閘門未通過：${blockers.length} 條阻擋`);
process.exit(pass ? 0 : 1);
```

- [ ] **Step 4: 執行以確認正確擋下**

Run: `cd /d/claudecode/cvrf-articles && node gate.js _ledger-example.json; echo "exit=$?"`
Expected: 印出 `斷言 1/3 SUPPORTED`、兩條 `✗`（一條 `percent — 與源文矛盾`、一條 `dose — 高風險類別(dose)未在源文找到`）、`閘門未通過：2 條阻擋`、`exit=1`

- [ ] **Step 5: 把矛盾那條改成 SUPPORTED、未找到那條刪除，確認會放行**

```bash
cd /d/claudecode/cvrf-articles
python - <<'PY'
import json
d = json.load(open('_ledger-example.json', encoding='utf-8'))
d['claims'] = [c for c in d['claims'] if c['classification'] != 'NOT_FOUND']
for c in d['claims']:
    c['classification'] = 'SUPPORTED'
json.dump(d, open('_ledger-example.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
PY
node gate.js _ledger-example.json; echo "exit=$?"
```

Expected: `斷言 2/2 SUPPORTED`、`閘門通過`、`exit=0`

- [ ] **Step 6: 刪除測試 ledger**

```bash
cd /d/claudecode/cvrf-articles && rm _ledger-example.json
```

- [ ] **Step 7: 不 commit**

`cvrf-articles/` 不屬於任何 git repo，無須提交。

---

### Task 3: 第一篇——血壓

**Files:**
- Create: `D:\claudecode\braintaiwan-media\_src\bp-130-brain.md`
- Create: `D:\claudecode\braintaiwan-media\build-cvrf-media.js`
- Create: `D:\claudecode\cvrf-articles\_ledger-bp-130-brain.json`
- Generated: `D:\claudecode\braintaiwan-media\posts\bp-130-brain.html`

**Interfaces:**
- Consumes: `_source-bp.md`（Task 1）、`node gate.js`（Task 2）、`build-milk-media.js` 的版型
- Produces: `build-cvrf-media.js` 中的 `articles` 陣列，Task 4、5 各自往其中追加一筆；`seriesBox` 會自動使三篇互相連結

- [ ] **Step 1: 起草文章**

寫 `_src/bp-130-brain.md`。frontmatter 只有 `title`，格式比照 `_src/resistant-htn-rdn.md`：

```markdown
---
title: "（開場場景＋數字型標題）"
---

# （同上，重複一次）

（開場：健檢報告 132/85、醫師說再觀察的具體場景，帶一個刺眼的數字）

## （小標）

...
```

必須包含的內容骨架（依 spec 第 4 節）：

1. 讀者卡點：健檢 132/85、被告知「再觀察」，於是觀察了五年
2. 核心翻轉：台灣 2022 指引已把高血壓定義下修至 130/80 mmHg，判準是居家 722 量測（連續 7 天、每日 2 次、每次 2 讀），不是診間單次數值
3. 腦的終點：收縮壓與腦小血管病變、無症狀腦梗塞、血管型失智
4. 收尾前連結既有文章，用行文自然帶入，不可寫成「延伸閱讀」清單：
   `[六顆藥壓不住的高血壓](/posts/resistant-htn-rdn.html)`
5. `> ### 🩺 神經專科 施懿恩醫師觀察` blockquote，收在觀察或開放問題
6. `## 參考來源` 項目清單（2024 AHA/ASA 一級中風預防指引、2022 台灣高血壓治療指引，含卷期頁）
7. 斜體免責聲明行

禁止：開場白、條列式衛教、行動呼籲、療效保證用語。

- [ ] **Step 2: 建 ledger，逐條把數字釘回源文**

把文中**每一個數字**（閾值、百分比、風險倍數、量測次數）各寫成一條，逐條在 `_source-bp.md` 用 grep 找到字面依據，記下行號：

```json
{
  "article": "bp-130-brain",
  "claims": [
    { "sentence": "<文中原句>", "claimType": "cutoff", "classification": "SUPPORTED", "source": "_source-bp.md:<行號>" }
  ]
}
```

`claimType` 用 `cutoff`（閾值）、`percent`（百分比／風險倍數）、`criterion`（診斷或量測準則）、`dose`（劑量）。找不到字面依據的，classification 填 `NOT_FOUND`；與源文不符的填 `CONTRADICTED`。**不得為了讓閘門通過而先填 SUPPORTED。**

- [ ] **Step 3: 跑閘門**

Run: `cd /d/claudecode/cvrf-articles && node gate.js _ledger-bp-130-brain.json; echo "exit=$?"`
Expected: `exit=0`。若非 0，依 blockers 修正**文章內容**（不是修 ledger），再重跑，直到通過。

- [ ] **Step 4: 建 build 腳本**

```bash
cd /d/claudecode/braintaiwan-media && cp build-milk-media.js build-cvrf-media.js
```

接著只改三處：

第 1 行註解改為：
```javascript
// Converts _src cerebrovascular-risk-factor articles to BrainTaiwan Media HTML pages.
```

第 8 行 `DATE` 改為：
```javascript
const DATE = '2026.07.21';
```

`articles` 陣列整個換成（Task 4、5 會再往下追加）：
```javascript
const articles = [
  {
    md: 'bp-130-brain.md',
    out: 'bp-130-brain.html',
    title: '',
    desc: '健檢 132/85 被告知再觀察，但台灣指引早就把高血壓定義下修到 130/80，而且判準是居家 722 量測不是診間那一次。從腦小血管病變與無症狀腦梗塞，看這個數字對大腦的意義。',
    tag: '高血壓 · 腦中風預防 · 腦小血管',
    nav: '血壓與腦',
  },
];
```

最後一行的 `console.log` 改為：
```javascript
console.log('完成：腦血管危險因子 media 文章');
```

- [ ] **Step 5: 語法檢查並 build**

```bash
cd /d/claudecode/braintaiwan-media
node --check build-cvrf-media.js && node build-cvrf-media.js
```

Expected: 印出 `寫出 bp-130-brain.html — <標題>` 與 `完成：腦血管危險因子 media 文章`

- [ ] **Step 6: 跑四個 post-build 腳本**

順序不可顛倒，缺一頁面就會靜默失去對應區塊：

```bash
cd /d/claudecode/braintaiwan-media
node inject-subscribe-box.js && node inject-clinic-box.js && node enhance-article-seo.js && node seo-build.js
```

- [ ] **Step 7: 驗證產出頁完整**

```bash
cd /d/claudecode/braintaiwan-media
for m in 'bt-subscribe-box' 'bt-clinic-box' 'application/ld+json' '施懿恩醫師觀察' '參考來源'; do
  printf "%s: " "$m"; grep -c "$m" posts/bp-130-brain.html
done
```

Expected: 五項全部 ≥ 1。任何一項為 0 就回 Step 6 或 Step 1 修正。

- [ ] **Step 8: 瀏覽器預覽**

用 `browser-cli` skill 開 `file:///D:/claudecode/braintaiwan-media/posts/bp-130-brain.html`，截圖確認排版、標題、注入框、結尾 blockquote 樣式正常。

- [ ] **Step 9: Commit（只加本篇相關檔案）**

```bash
cd /d/claudecode/braintaiwan-media
git add _src/bp-130-brain.md build-cvrf-media.js posts/bp-130-brain.html
git commit -m "feat: 新增血壓與腦 media 文章（cvrf 系列第一篇）"
git show --stat --oneline HEAD | tail -5
```

Expected: 只有 3 個檔案。**不要 `git add` `sitemap.xml` 或其他 `posts/*.html`**——`seo-build.js` 會動到 sitemap，那部分留到 Task 6 一併處理。

---

### Task 4: 第二篇——膽固醇

**Files:**
- Create: `D:\claudecode\braintaiwan-media\_src\ldl-brain-target.md`
- Modify: `D:\claudecode\braintaiwan-media\build-cvrf-media.js`（`articles` 陣列追加第二筆）
- Create: `D:\claudecode\cvrf-articles\_ledger-ldl-brain-target.json`
- Generated: `D:\claudecode\braintaiwan-media\posts\ldl-brain-target.html`

**Interfaces:**
- Consumes: `_source-lipid.md`（Task 1）、`node gate.js`（Task 2）、`build-cvrf-media.js`（Task 3 建立）
- Produces: `articles` 陣列第二筆；`seriesBox` 自動在兩篇之間互相連結

- [ ] **Step 1: 起草文章**

寫 `_src/ldl-brain-target.md`，frontmatter 只有 `title`。必須包含的骨架（依 spec 第 4 節）：

1. 讀者卡點：總膽固醇打勾、LDL 紅字；或「我又沒有心臟病，吃什麼藥」
2. 核心翻轉：LDL 沒有全民通用標準值，**目標值由風險分層決定**——同一個 LDL 數值在不同風險族群結論可以完全相反（依 2025 台灣血脂管理臨床路徑共識）
3. 腦的終點：頸動脈與顱內動脈粥狀硬化 → 梗塞性中風
4. **必須保留的灰區**：LDL 與出血性中風的關係不像缺血性中風那樣單向（依 2024 AHA/ASA 指引）。用戶已明確確認保留此段，不得為了行文乾脆而刪除
5. `> ### 🩺 神經專科 施懿恩醫師觀察` blockquote
6. `## 參考來源` 項目清單
7. 斜體免責聲明行

- [ ] **Step 2: 建 ledger 並跑閘門**

作法與 Task 3 Step 2 相同，源文改為 `_source-lipid.md`。風險分層的各級 LDL 目標值全部屬 `cutoff`，是本篇風險最高的一類數字。

```bash
cd /d/claudecode/cvrf-articles && node gate.js _ledger-ldl-brain-target.json; echo "exit=$?"
```

Expected: `exit=0`。未過則修文章、不修 ledger。

- [ ] **Step 3: 追加到 build 腳本**

在 `build-cvrf-media.js` 的 `articles` 陣列末端（`bp-130-brain` 那筆之後）追加：

```javascript
  {
    md: 'ldl-brain-target.md',
    out: 'ldl-brain-target.html',
    title: '',
    desc: '總膽固醇正常、LDL 紅字，到底要不要緊？LDL 沒有全民通用的標準值，目標值由風險分層決定——同一個數字在不同人身上，結論可以完全相反。',
    tag: '膽固醇 · 動脈硬化 · 腦中風預防',
    nav: '膽固醇與腦',
  },
```

- [ ] **Step 4: 語法檢查、build、跑四個 post-build 腳本**

```bash
cd /d/claudecode/braintaiwan-media
node --check build-cvrf-media.js && node build-cvrf-media.js
node inject-subscribe-box.js && node inject-clinic-box.js && node enhance-article-seo.js && node seo-build.js
```

Expected: 印出兩行 `寫出 ...`（第一篇會被一併重建，這是正常的）

- [ ] **Step 5: 驗證兩篇都完整，且系列框已互連**

```bash
cd /d/claudecode/braintaiwan-media
for f in posts/bp-130-brain.html posts/ldl-brain-target.html; do
  echo "== $f"
  for m in 'bt-subscribe-box' 'bt-clinic-box' 'application/ld+json' '施懿恩醫師觀察' '參考來源'; do
    printf "  %s: " "$m"; grep -c "$m" "$f"
  done
done
grep -c 'ldl-brain-target.html' posts/bp-130-brain.html
grep -c 'bp-130-brain.html' posts/ldl-brain-target.html
```

Expected: 各項 ≥ 1；最後兩個計數也 ≥ 1（代表 `seriesBox` 已互相連結）

- [ ] **Step 6: 瀏覽器預覽**

用 `browser-cli` skill 開 `file:///D:/claudecode/braintaiwan-media/posts/ldl-brain-target.html`，截圖確認排版與系列框。

- [ ] **Step 7: Commit**

```bash
cd /d/claudecode/braintaiwan-media
git add _src/ldl-brain-target.md build-cvrf-media.js posts/ldl-brain-target.html posts/bp-130-brain.html
git commit -m "feat: 新增膽固醇與腦 media 文章（cvrf 系列第二篇）"
git show --stat --oneline HEAD | tail -5
```

Expected: 4 個檔案（`bp-130-brain.html` 因系列框更新而變動，屬預期內）

---

### Task 5: 第三篇——怕副作用而不吃藥

**Files:**
- Create: `D:\claudecode\braintaiwan-media\_src\statin-bp-drug-fear.md`
- Modify: `D:\claudecode\braintaiwan-media\build-cvrf-media.js`（`articles` 陣列追加第三筆）
- Create: `D:\claudecode\cvrf-articles\_ledger-statin-bp-drug-fear.json`
- Read: `D:\claudecode\media-article-backlog\medication-fear-side-effects.md`（素材，**不修改**）
- Generated: `D:\claudecode\braintaiwan-media\posts\statin-bp-drug-fear.html`

**Interfaces:**
- Consumes: backlog 兩篇草稿、`_source-bp.md` 與 `_source-lipid.md`、`node gate.js`
- Produces: `articles` 陣列第三筆，系列完成

- [ ] **Step 1: 起草文章**

讀 `D:\claudecode\media-article-backlog\medication-fear-side-effects.md` 的兩篇草稿當骨架，重寫為單篇。必須包含（依 spec 第 4 節）：

1. **範圍收窄到降壓藥與 statin 兩類**，不泛談所有藥物——它現在是前兩篇的收尾，不是獨立文（用戶已確認）
2. statin 肌肉痠痛的反安慰劑（nocebo）效應：盲性試驗中真藥組與安慰劑組肌肉症狀通報率的落差
3. 降壓藥頭暈多半是劑量與服藥時間的問題，不是「這個藥不適合我」
4. 落點是「**開始的方式可以談**」而非「你該乖乖吃藥」，沿用原草稿中該問醫師的那幾個問題，但改寫成行文、不作條列
5. `> ### 🩺 神經專科 施懿恩醫師觀察` blockquote
6. `## 參考來源` 項目清單
7. 斜體免責聲明行

**backlog 原檔保留不動**，日後仍可據以另寫其他科別版本。

- [ ] **Step 2: 建 ledger 並跑閘門**

本篇的 nocebo 相關數字若不在 `_source-bp.md`／`_source-lipid.md` 中，**不得憑印象寫入**。兩條路可選：

- 從文章中移除該數字，改用不含數字的敘述
- 另行查證原始試驗（如 SAMSON、StatinWISE 一類的 n-of-1 或盲性再挑戰試驗），把該來源加進 `## 參考來源`，並在 ledger 的 `source` 欄填該文獻而非行號

```bash
cd /d/claudecode/cvrf-articles && node gate.js _ledger-statin-bp-drug-fear.json; echo "exit=$?"
```

Expected: `exit=0`

- [ ] **Step 3: 追加到 build 腳本**

在 `articles` 陣列末端追加：

```javascript
  {
    md: 'statin-bp-drug-fear.md',
    out: 'statin-bp-drug-fear.html',
    title: '',
    desc: '藥拿了卻沒開始吃，因為怕副作用。statin 的肌肉痠痛有多少來自反安慰劑效應、降壓藥頭暈是不是劑量問題，以及為什麼「開始的方式」本來就可以跟醫師談。',
    tag: '用藥安全 · 反安慰劑效應 · 慢性病',
    nav: '怕副作用',
  },
```

- [ ] **Step 4: 語法檢查、build、跑四個 post-build 腳本**

```bash
cd /d/claudecode/braintaiwan-media
node --check build-cvrf-media.js && node build-cvrf-media.js
node inject-subscribe-box.js && node inject-clinic-box.js && node enhance-article-seo.js && node seo-build.js
```

Expected: 印出三行 `寫出 ...`

- [ ] **Step 5: 驗證三篇皆完整**

```bash
cd /d/claudecode/braintaiwan-media
for f in posts/bp-130-brain.html posts/ldl-brain-target.html posts/statin-bp-drug-fear.html; do
  echo "== $f"
  for m in 'bt-subscribe-box' 'bt-clinic-box' 'application/ld+json' '施懿恩醫師觀察' '參考來源'; do
    printf "  %s: " "$m"; grep -c "$m" "$f"
  done
done
```

Expected: 15 項全部 ≥ 1

- [ ] **Step 6: 瀏覽器預覽**

用 `browser-cli` skill 開第三篇，截圖確認。

- [ ] **Step 7: Commit**

```bash
cd /d/claudecode/braintaiwan-media
git add _src/statin-bp-drug-fear.md build-cvrf-media.js posts/statin-bp-drug-fear.html posts/bp-130-brain.html posts/ldl-brain-target.html
git commit -m "feat: 新增用藥依從性 media 文章（cvrf 系列第三篇）"
git show --stat --oneline HEAD | tail -6
```

Expected: 5 個檔案

---

### Task 6: 首頁卡片、品牌檢核與交付預覽

**Files:**
- Modify: `D:\claudecode\braintaiwan-media\index.html:356`（在 `resistant-htn-rdn` 卡片前插入三張新卡片）
- Modify: `D:\claudecode\braintaiwan-media\sitemap.xml`（由 `seo-build.js` 產生）

**Interfaces:**
- Consumes: Task 3–5 產出的三個 `posts/*.html`
- Produces: 可交付預覽的完整站點；**不 push**

- [ ] **Step 1: 插入三張首頁卡片**

`index.html` 的文章卡片是**手動維護**的（目前 45 張），不由腳本產生。在第 356 行 `<a href="posts/resistant-htn-rdn.html" ...>` **之前**插入下列三張，使新文置於既有血壓文之上：

```html
    <a href="posts/bp-130-brain.html" class="article-card" data-topic="stroke">
      <div class="card-visual" style="background:linear-gradient(135deg,#b71c1c,#4a148c);">🩸</div>
      <div class="card-body">
        <span class="card-tag" style="background:#ffebee;color:#b71c1c;">高血壓 · 腦中風預防 · 腦小血管</span>
        <div class="card-title">（與 _src/bp-130-brain.md 的 title 完全一致）</div>
        <div class="card-desc">（與 build-cvrf-media.js 中該筆的 desc 完全一致）</div>
        <div class="card-meta">施懿恩 · 2026.07.21</div>
      </div>
    </a>

    <a href="posts/ldl-brain-target.html" class="article-card" data-topic="stroke">
      <div class="card-visual" style="background:linear-gradient(135deg,#e65100,#880e4f);">🧈</div>
      <div class="card-body">
        <span class="card-tag" style="background:#fff3e0;color:#e65100;">膽固醇 · 動脈硬化 · 腦中風預防</span>
        <div class="card-title">（與 _src/ldl-brain-target.md 的 title 完全一致）</div>
        <div class="card-desc">（與 build-cvrf-media.js 中該筆的 desc 完全一致）</div>
        <div class="card-meta">施懿恩 · 2026.07.21</div>
      </div>
    </a>

    <a href="posts/statin-bp-drug-fear.html" class="article-card" data-topic="stroke">
      <div class="card-visual" style="background:linear-gradient(135deg,#00695c,#263238);">💊</div>
      <div class="card-body">
        <span class="card-tag" style="background:#e0f2f1;color:#00695c;">用藥安全 · 反安慰劑效應 · 慢性病</span>
        <div class="card-title">（與 _src/statin-bp-drug-fear.md 的 title 完全一致）</div>
        <div class="card-desc">（與 build-cvrf-media.js 中該筆的 desc 完全一致）</div>
        <div class="card-meta">施懿恩 · 2026.07.21</div>
      </div>
    </a>

```

`data-topic` 沿用既有血壓文的 `stroke`（首頁分類篩選用）。

- [ ] **Step 2: 驗證卡片數與連結**

```bash
cd /d/claudecode/braintaiwan-media
grep -o 'posts/[a-z0-9-]*\.html' index.html | sort -u | wc -l
for s in bp-130-brain ldl-brain-target statin-bp-drug-fear; do
  printf "%s: index=%s file=" "$s" "$(grep -c "posts/$s.html" index.html)"
  test -f "posts/$s.html" && echo yes || echo NO
done
```

Expected: 卡片總數 48（原 45 + 3）；三行皆 `index=1 file=yes`

- [ ] **Step 3: 重跑 sitemap**

```bash
cd /d/claudecode/braintaiwan-media && node seo-build.js
grep -c "bp-130-brain\|ldl-brain-target\|statin-bp-drug-fear" sitemap.xml
```

Expected: `3`

- [ ] **Step 4: 品牌指南逐條檢核**

讀 `D:\claudecode\BRAND_STYLE_GUIDE.md`，對三篇逐條核對：五支柱、禁用詞清單、發佈前檢核表。特別確認：

- 三篇皆無療效保證用語（三篇都涉及用藥，受醫療法廣告限制）
- 結尾 blockquote 收在觀察或開放問題，不是總結、行動呼籲或勵志結語
- 無 AI 塑膠文特徵（開場白、條列衛教、呼籲行動）

發現的問題直接修 `_src/*.md`，然後重跑 Task 5 Step 4 的 build 與四個 post-build 腳本。

- [ ] **Step 5: 全站預覽**

用 `browser-cli` skill 依序開啟並截圖：

1. `file:///D:/claudecode/braintaiwan-media/index.html` — 確認三張新卡片位置、配色、與既有卡片的視覺一致性
2. 三篇文章各一次 — 確認系列框、注入框、行動版排版

- [ ] **Step 6: Commit**

```bash
cd /d/claudecode/braintaiwan-media
git add index.html sitemap.xml robots.txt
git commit -m "feat: cvrf 系列上首頁卡片並更新 sitemap"
git log --oneline -4
```

- [ ] **Step 7: 交付，等待用戶決定是否 push**

向用戶報告：三篇的 claim-gate 通過數、品牌檢核結果、預覽截圖、四個 commit 的 hash。

**在此停止。** 不執行 `git push`、不部署、不產 FB 圖卡。依 spec 第 6 節與 `braintaiwan-media/CLAUDE.md`，推送需用戶在當次對話中明確同意。

---

## 完成定義

- [ ] 三篇 `_src/*.md` 存在，皆有 frontmatter title、`🩺 神經專科 施懿恩醫師觀察` 結尾 blockquote、`## 參考來源`、免責聲明行
- [ ] 三個 ledger 皆 `node gate.js` exit 0
- [ ] `build-cvrf-media.js` 通過 `node --check`，產出三個 `posts/*.html`
- [ ] 三篇皆含 subscribe box、clinic box、JSON-LD schema
- [ ] 第一篇內文連結 `resistant-htn-rdn`；三篇經 `seriesBox` 互連
- [ ] `index.html` 48 張卡片，sitemap 含三個新 URL
- [ ] 品牌指南逐條檢核通過
- [ ] 四個 commit，每個只含預期檔案，未夾帶換行符差異的 46 個既有檔案
- [ ] 未 push、未部署、未發 FB
