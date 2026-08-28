# 每日晨報產線規則

適用於每天自動執行的 "Taiwan daily health brief" 雲端 routine，以及任何手動
補寫的每日文章。兩條硬規則：**主題一週不重複**、**引用必須完整**。

---

## 一、主題一週不重複

### 規則

同一個「主題群」在最近 **7 天**內出現過，今天就不能再寫。判定的是主題群，
不是標題字面——「小中風的警訊」和「年輕型中風」是同一群（`stroke`），即使
標題完全不同。

主題群清單定義在 `topic-guard.js` 的 `TAXONOMY`：

| id | 主題群 |
| --- | --- |
| `stroke` | 腦中風與腦血管 |
| `dementia` | 失智症與認知退化 |
| `brain-infection` | 腦部感染與疫苗 |
| `sleep` | 睡眠與大腦 |
| `heat-environment` | 高溫與環境暴露 |
| `headache-pain` | 頭痛與疼痛 |
| `epilepsy` | 癲癇與意識障礙 |
| `movement` | 動作障礙 |
| `neuro-trauma` | 頭部外傷與腦震盪 |
| `nutrition-toxin` | 飲食、酒精與神經毒性 |
| `mental-nerve` | 精神症狀與神經 |
| `peripheral-spine` | 周邊神經與脊椎 |
| `neuro-immune` | 神經免疫疾病 |
| `metabolic-vascular` | 代謝與血管危險因子 |
| `brain-tumor` | 腦瘤與神經腫瘤 |
| `aging-lifestyle` | 老化與大腦保健 |

要新增主題群，直接在 `TAXONOMY` 加一筆（`id`、`label`、`kw` 關鍵詞陣列）。

### 操作方式

選題「之前」先看牌面：

```bash
node topic-guard.js
```

會列出最近 7 天每篇文章的主題群、本次被封鎖的主題群，以及冷卻最久的可選主題群。

決定候選題目之後、動筆之前，驗證：

```bash
node topic-guard.js --check "候選題目或一句話描述"
```

exit code 1 = 被封鎖，必須換題；exit code 0 = 可寫。

新文章的 front-matter 必須明確寫上主題群 id，之後就不必靠關鍵詞猜：

```yaml
---
title: "……"
topic: headache-pain
---
```

跨兩個主題群的文章（例如「中風後的中樞型睡眠呼吸中止」）用逗號寫兩個，
兩群都會進入冷卻：

```yaml
topic: sleep, stroke
```

`topic-guard.js` 優先讀 front-matter 的 `topic:`，沒有才用關鍵詞推定（舊文章
即屬此類）。2026-08-01 之後的文章已回填 `topic:`。

### 為什麼需要這條規則

2026-08-05 至 08-12 這 8 天裡，`brain-infection` 出現 5 次、`stroke` 出現 2 次。
熱門新聞天然會擠在同一個主題附近，若只用「今天最熱的健康新聞」當唯一選題準則，
產線會持續在同一個題目群打轉。冷卻視窗強迫每週涵蓋較廣的神經科面向。

如果當天真的只有被封鎖主題群的重大新聞（例如疫情爆發），仍應換題——
把該新聞留到冷卻期滿，或改從尚未寫過的角度切入另一個主題群。

---

## 二、期刊引用必須完整

### 規則

`## 參考來源` 裡的每一筆期刊論文，都要能讓讀者直接找到原文。**期刊名 + 標題
是不夠的**，必須含：作者、標題、期刊全名（斜體）、年份、卷(期):頁碼、
DOI 或 PMID。

**期刊論文**

```
- Solomon T, Vaughn DW. "Pathogenesis and clinical features of Japanese encephalitis." *New England Journal of Medicine*, 2004;351(4):370–378. DOI: 10.1056/NEJMra020092
```

- 三位以上作者用 `第一作者 姓名縮寫, et al.`
- 期刊用**全名**、以 `*斜體*` 標示。`PubMed`、`PMC`、`ScienceDirect`、
  `Oxford Academic` 是資料庫不是期刊名，不可放在期刊欄位
- 線上優先發表尚無卷期頁碼時可省略該欄，但 DOI 一定要有
- 沒有 DOI 的舊文獻用 `PMID: 12345678`

**機關、新聞、衛教資料**

```
- 衛生福利部疾病管制署，〈國內出現今年首例日本腦炎死亡病例〉，2026 年 7 月 28 日
```

機構名 + 〈標題〉 + 發布日期，三者缺一不可。

**臨床試驗登錄**

```
- ClinicalTrials.gov，"Sleep-Disordered Breathing in the Acute Phase After Stroke"，NCT06811948，2025
```

**臨床指引**

```
- American Heart Association／American Stroke Association，〈2026 Guidelines for the Early Management of Patients With Acute Ischemic Stroke〉，*Stroke*，2026。DOI: 10.1161/STR.0000000000000475
```

### 溯源要求

文章中每一個數字、每一個具名研究，都要能對應到 `## 參考來源` 的某一筆。
研究數據要引**原始論文**，不能只引報導該研究的新聞——新聞可以額外列為
事件來源，但不能取代論文本身。至少要有一筆真正的期刊引用。

### 操作方式

```bash
node check-citations.js                    # 檢查 _src 內日期最新的一篇
node check-citations.js _src/<slug>.md     # 檢查指定文章
node check-citations.js --all              # 稽核全部（會列出舊文欠債）
```

有錯誤時 exit code 1。發布前必須跑到 0 錯誤。警告（⚠️）不阻擋發布，但應盡量清掉。

舊文章目前尚有大量不完整引用（`--all` 會列出）。不需要一次補完，
但**新文章不得再增加欠債**。

---

## 三、雲端 routine

排程 routine「Taiwan daily health brief」由 HTTP API 建立，agent 無法改寫它的
prompt，只能在 Claude 網頁介面手動更新。`docs/daily-routine-prompt.md` 存的就是
該貼上去的文字，**整份檔案就是 prompt 本身**，不含任何說明文字，可以整份複製。

在網頁介面設定 routine 時，除了 prompt 還要確認：

- **Repository 指向 `ymeroom/braintaiwan-media`。** 少了這一項，觸發的 session
  不會 clone 到這個 repo，整個流程從 STEP 0 就跑不動。
- 同名的舊 routine 要停用，否則同一天會產出兩篇文章。

即使 routine 尚未更新，`CLAUDE.md` 與 `AGENTS.md` 已載明這兩道關卡，每日 agent
在 session 啟動時就會讀到。

### 分支與發布路徑：推到 session 分支就會自動上線

雲端 session 通常被指派一條 `claude/xxx` 分支，而 GitHub Pages 只服務 `main`。
兩者由 `.github/workflows/publish-daily-brief.yml` 接起來：只要有 push 進
`claude/**`，該 workflow 就會把分支**快轉合併**進 `main`。三道閘門是

1. 只看 `claude/**` 分支；
2. 最新一個 commit 的訊息必須以 `Daily morning-brief:` 或 `FB draft:` 開頭
   ——人工開發分支不會被誤送上線；
3. 只做 fast-forward。分支若不是 `main` 的直接延伸就整個不動，不覆寫任何東西。

所以**每日 agent 把文章推上自己的分支就算發布完成，不需要人工合併**，也不必
（更不該）另外推一次 `main`。workflow 是 push 之後才跑，會有幾十秒的延遲；要
確認結果，重新 `git fetch origin main` 再查。

第 3 道閘門失敗（workflow exit 1）代表 `main` 在這期間長出了別的 commit，此時
分支停在原地、`main` 不動，需要人工把 `main` 併進分支再推一次。

### 確認「文章到底上線了沒」的正確指令

`CLAUDE.md` 裡那句 `git log --oneline origin/<branch>..origin/main | wc -l`
回答的是**「`main` 有沒有長出我沒有的東西」**（非零表示 `main` 動過、分支已落後），
拿它來判斷發布會出錯：`main` 落後、以及 `main` 與分支完全一致，兩種情況都是 0。

判斷有沒有上線要問反方向——我的 commit 進到 `main` 了嗎：

```bash
git fetch origin main
git merge-base --is-ancestor HEAD origin/main && echo 已上線 || echo 尚未上線
# 或直接列出分支上還沒進 main 的 commit（空的就是全部到齊）
git log --oneline origin/main..HEAD
```

2026-08-28 那天就是誤用了前一個指令，明明 workflow 已經把文章送上 `main`，
報告卻寫成「尚未發布、請手動合併」。

## 四、每日流程檢查點

1. `node topic-guard.js` → 取得封鎖／可選主題群
2. 搜尋當日新聞時，只在可選主題群內找題
3. `node topic-guard.js --check "<候選題目>"` → 必須 exit 0
4. 寫作，front-matter 填入 `topic:`，來源依上述格式
5. `node check-citations.js _src/<slug>.md` → 必須 exit 0
6. `node build-daily.js` → `node enhance-article-seo.js` → `node seo-build.js`
7. 更新 `index.html`，commit、push 到 session 分支（workflow 會自動快轉上 `main`）
8. `git fetch origin main` 後用 `git log --oneline origin/main..HEAD` 確認為空
   ——空的才代表真的上線了
