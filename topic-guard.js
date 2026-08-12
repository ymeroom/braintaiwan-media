#!/usr/bin/env node
// topic-guard.js — 每日晨報選題去重守門員
//
// 目的：避免每日產線在同一個主題群（腦中風、腦炎、失智…）連續打轉。
// 規則：同一主題群在最近 N 天（預設 7 天）內出現過，就不得再寫。
//
// 用法：
//   node topic-guard.js                  列出封鎖主題 + 建議主題（依冷卻天數排序）
//   node topic-guard.js --check "<候選主題文字>"   檢查候選題目；被封鎖時 exit 1
//   node topic-guard.js --days 10        改變冷卻視窗
//   node topic-guard.js --today 2026-08-13   指定「今天」（測試用）
//   node topic-guard.js --json           以 JSON 輸出
//
// 主題判定順序：
//   1. _src/<file>.md 的 YAML front-matter `topic: <id>`（明確指定，優先）
//   2. 標題 + 內文的關鍵詞計分（舊文章沒有 topic 欄位時的回退）

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '_src');
const DEFAULT_WINDOW_DAYS = 7;

// ---------------------------------------------------------------- 主題分類表
// id 為 front-matter `topic:` 可寫入的正式值。新增主題群請直接加在這裡。
const TAXONOMY = [
  { id: 'stroke', label: '腦中風與腦血管',
    kw: ['中風', '腦梗塞', '梗塞', '溶栓', '取栓', '血栓', 'TIA', '小中風', '腦出血', '腦血管', '頸動脈', '動脈瘤', 'tenecteplase', 'stroke'] },
  { id: 'dementia', label: '失智症與認知退化',
    kw: ['失智', '阿茲海默', '認知退化', '認知功能', '記憶力', 'tau', '類澱粉', 'amyloid', '腦齡', '輕度認知障礙', 'MCI', 'dementia', 'lecanemab'] },
  { id: 'brain-infection', label: '腦部感染與疫苗',
    kw: ['腦炎', '腦膜炎', '日本腦炎', '登革熱', '新冠', 'COVID', '疫苗', '病毒', '細菌', '感染', '流感', '腸病毒', '帶狀疱疹', 'encephalitis', 'meningitis'] },
  { id: 'sleep', label: '睡眠與大腦',
    kw: ['睡眠', '失眠', '呼吸中止', '打鼾', '熬夜', '嗜睡', '生理時鐘', '午睡', 'CPAP', 'apnea', 'sleep'] },
  { id: 'heat-environment', label: '高溫與環境暴露',
    kw: ['高溫', '熱浪', '熱傷害', '中暑', '熱衰竭', '氣溫', '空汙', 'PM2.5', '噪音', '氣候', '寒流', '低溫', 'heat', 'heatwave'] },
  { id: 'headache-pain', label: '頭痛與疼痛',
    kw: ['頭痛', '偏頭痛', '叢發性', '神經痛', '三叉神經', '慢性疼痛', 'migraine'] },
  { id: 'epilepsy', label: '癲癇與意識障礙',
    kw: ['癲癇', '抽搐', '痙攣', '昏迷', '暈厥', '失神', 'seizure', 'epilepsy'] },
  { id: 'movement', label: '動作障礙',
    kw: ['帕金森', '顫抖', '手抖', '肌張力', '運動失調', '舞蹈症', '步態', 'parkinson', 'tremor'] },
  { id: 'neuro-trauma', label: '頭部外傷與腦震盪',
    kw: ['腦震盪', '頭部外傷', '硬膜下', '硬膜外', '撞擊', '跌倒', '安全帽', '頭槌', 'concussion', 'hematoma'] },
  { id: 'nutrition-toxin', label: '飲食、酒精與神經毒性',
    kw: ['飲食', '營養', '酒精', '喝酒', '甜味劑', '果糖', '含糖', '咖啡因', '重金屬', '農藥', '一氧化碳', '毒', '補充品', '蛋白質', '牛奶', '豆漿'] },
  { id: 'mental-nerve', label: '精神症狀與神經',
    kw: ['憂鬱', '焦慮', '情緒', '壓力', '思覺失調', '自律神經', '恐慌', '孤獨', '照顧者', 'depression', 'anxiety'] },
  { id: 'peripheral-spine', label: '周邊神經與脊椎',
    kw: ['周邊神經', '腕隧道', '椎間盤', '頸椎', '坐骨神經', '手麻', '腳麻', '神經壓迫', '脊髓', 'neuropathy'] },
  { id: 'neuro-immune', label: '神經免疫疾病',
    kw: ['多發性硬化', '重症肌無力', '格林巴利', '自體免疫', '免疫治療', '視神經脊髓炎', 'sclerosis', 'myasthenia'] },
  { id: 'metabolic-vascular', label: '代謝與血管危險因子',
    kw: ['血壓', '高血壓', '血糖', '糖尿病', '血脂', '膽固醇', 'LDL', 'GLP-1', '肥胖', '代謝症候群', '腎臟', '心房顫動'] },
  { id: 'brain-tumor', label: '腦瘤與神經腫瘤',
    kw: ['腦瘤', '膠質瘤', '腦轉移', '腫瘤', '化療', '放療', 'glioma'] },
  { id: 'aging-lifestyle', label: '老化與大腦保健',
    kw: ['老化', '運動', '肌少症', '長照', '衰弱', '社交', '學習', '腦力', '退休', '聽力'] },
];

const MIN_SCORE = 3;          // 低於此分數視為無法歸類
const TITLE_WEIGHT = 3;       // 標題出現的關鍵詞權重

// ------------------------------------------------------------------- 工具函式
function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function todayISO() {
  // 以 Asia/Taipei 為準，產線在台灣時間清晨執行
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

function daysBetween(aISO, bISO) {
  const a = Date.parse(aISO + 'T00:00:00Z');
  const b = Date.parse(bISO + 'T00:00:00Z');
  return Math.round((a - b) / 86400000);
}

function classify(title, body) {
  const t = (title || '').toLowerCase();
  const b = (body || '').toLowerCase();
  const scores = TAXONOMY.map(cat => {
    let score = 0;
    const hits = [];
    for (const kw of cat.kw) {
      const k = kw.toLowerCase();
      const inTitle = t.includes(k);
      const bodyHits = b.split(k).length - 1;
      if (inTitle) score += TITLE_WEIGHT;
      if (bodyHits) score += Math.min(bodyHits, 4);
      if (inTitle || bodyHits) hits.push(kw);
    }
    return { id: cat.id, label: cat.label, score, hits };
  }).sort((x, y) => y.score - x.score);

  const top = scores[0];
  if (!top || top.score < MIN_SCORE) {
    return { id: 'uncategorized', label: '無法歸類', score: top ? top.score : 0, hits: [], runnerUp: scores[1] };
  }
  return { ...top, runnerUp: scores[1] };
}

function parseFrontMatter(src) {
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fm) return { data: {}, body: src };
  const data = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*):\s*"?(.*?)"?\s*$/);
    if (m) data[m[1]] = m[2];
  }
  return { data, body: src.slice(fm[0].length) };
}

// ---------------------------------------------------------- 掃描已發布的文章
function loadArticles() {
  if (!fs.existsSync(SRC)) return [];
  return fs.readdirSync(SRC)
    .filter(f => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(f))
    .map(f => {
      const src = fs.readFileSync(path.join(SRC, f), 'utf8');
      const { data, body } = parseFrontMatter(src);
      const date = f.slice(0, 10);
      const slug = f.slice(11, -3);
      const title = data.title || (body.match(/^#\s+(.*)$/m) || [])[1] || slug;
      // `topic:` 可寫多個主題群（逗號分隔），跨主題的文章會同時封鎖兩群
      const declared = (data.topic || '')
        .split(/[,，\s]+/)
        .map(s => s.trim())
        .filter(s => TAXONOMY.some(c => c.id === s));
      const guessed = classify(title, body);
      const topics = declared.length ? declared : [guessed.id];
      const labels = topics.map(id => (TAXONOMY.find(c => c.id === id) || {}).label || guessed.label);
      return {
        file: f, date, slug, title,
        topics,
        topic: topics[0],
        topicLabel: labels.join(' + '),
        topicSource: declared.length ? 'front-matter' : 'keyword',
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ------------------------------------------------------------------ 主要邏輯
function buildReport(windowDays, today) {
  const articles = loadArticles();
  const recent = articles.filter(a => {
    const d = daysBetween(today, a.date);
    return d >= 0 && d <= windowDays;
  });

  const blocked = new Map();
  for (const a of recent) {
    for (const id of a.topics) {
      if (id === 'uncategorized') continue;
      if (!blocked.has(id)) blocked.set(id, []);
      blocked.get(id).push(a);
    }
  }

  const lastUsed = new Map();
  for (const a of articles) {
    for (const id of a.topics) {
      if (!lastUsed.has(id)) lastUsed.set(id, a.date);
    }
  }

  const available = TAXONOMY
    .filter(c => !blocked.has(c.id))
    .map(c => ({
      id: c.id,
      label: c.label,
      lastUsed: lastUsed.get(c.id) || null,
      daysSince: lastUsed.has(c.id) ? daysBetween(today, lastUsed.get(c.id)) : null,
    }))
    .sort((a, b) => (b.daysSince === null ? 9999 : b.daysSince) - (a.daysSince === null ? 9999 : a.daysSince));

  return { today, windowDays, recent, blocked, available, articles };
}

function printReport(r) {
  console.log(`選題去重檢查（今天 ${r.today}，冷卻視窗 ${r.windowDays} 天）`);
  console.log('');
  console.log(`最近 ${r.windowDays} 天已發布（${r.recent.length} 篇）：`);
  for (const a of r.recent) {
    const mark = a.topicSource === 'front-matter' ? '' : '（關鍵詞推定）';
    console.log(`  ${a.date}  [${a.topics.join(', ')}] ${a.topicLabel || ''}${mark}  ${a.title}`);
  }
  console.log('');
  console.log(`🚫 本次禁止選用的主題群（${r.blocked.size} 個）：`);
  if (r.blocked.size === 0) {
    console.log('  （無）');
  } else {
    for (const [id, list] of r.blocked) {
      const cat = TAXONOMY.find(c => c.id === id);
      console.log(`  ${id}（${cat ? cat.label : id}）— ${list.length} 篇，最近一次 ${list[0].date}`);
    }
  }
  console.log('');
  console.log('✅ 可選主題群（冷卻最久的排前面）：');
  for (const c of r.available.slice(0, 10)) {
    const when = c.lastUsed ? `上次 ${c.lastUsed}，已隔 ${c.daysSince} 天` : '從未寫過';
    console.log(`  ${c.id}（${c.label}）— ${when}`);
  }
}

function runCheck(candidate, r) {
  const guess = classify(candidate, candidate);
  console.log(`候選題目：${candidate}`);
  console.log(`判定主題群：${guess.id}（${guess.label}），分數 ${guess.score}`);
  if (guess.runnerUp && guess.runnerUp.score >= MIN_SCORE) {
    console.log(`次高主題群：${guess.runnerUp.id}（${guess.runnerUp.label}），分數 ${guess.runnerUp.score}`);
  }

  const conflicts = [];
  if (r.blocked.has(guess.id)) conflicts.push({ id: guess.id, list: r.blocked.get(guess.id) });
  // 次高主題群若分數接近（≥ 首位的 70%）也一併檢查，避免跨界重複
  if (guess.runnerUp && guess.runnerUp.score >= MIN_SCORE &&
      guess.runnerUp.score >= guess.score * 0.7 && r.blocked.has(guess.runnerUp.id)) {
    conflicts.push({ id: guess.runnerUp.id, list: r.blocked.get(guess.runnerUp.id) });
  }

  if (conflicts.length) {
    console.log('');
    console.log('🚫 不可使用：此主題群在冷卻視窗內已經寫過');
    for (const c of conflicts) {
      for (const a of c.list) console.log(`   ${a.date} [${c.id}] ${a.title}`);
    }
    console.log('');
    console.log('請改選以下冷卻最久的主題群之一：');
    for (const c of r.available.slice(0, 5)) {
      console.log(`   ${c.id}（${c.label}）— ${c.lastUsed ? `上次 ${c.lastUsed}` : '從未寫過'}`);
    }
    return 1;
  }

  if (guess.id === 'uncategorized') {
    console.log('');
    console.log('⚠️  無法歸類到既有主題群。請在 front-matter 明確填入 topic:，或補充候選題目描述後重跑。');
    console.log('    未被封鎖，可以繼續，但請人工確認不與最近 7 天重複。');
    return 0;
  }

  console.log('');
  console.log(`✅ 可以使用：${guess.id} 在最近 ${r.windowDays} 天內沒有出現過。`);
  console.log(`   請在 _src/<slug>.md 的 front-matter 加上 topic: ${guess.id}`);
  return 0;
}

// ----------------------------------------------------------------------- main
const windowDays = parseInt(argValue('--days', String(DEFAULT_WINDOW_DAYS)), 10);
const today = argValue('--today', todayISO());
const report = buildReport(windowDays, today);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    today: report.today,
    windowDays: report.windowDays,
    recent: report.recent,
    blocked: [...report.blocked.keys()],
    available: report.available,
  }, null, 2));
  process.exit(0);
}

const checkIdx = process.argv.indexOf('--check');
if (checkIdx !== -1) {
  const candidate = process.argv.slice(checkIdx + 1).filter(a => !a.startsWith('--')).join(' ');
  if (!candidate) {
    console.error('用法：node topic-guard.js --check "<候選主題文字>"');
    process.exit(2);
  }
  process.exit(runCheck(candidate, report));
}

printReport(report);
