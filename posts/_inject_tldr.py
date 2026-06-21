# -*- coding: utf-8 -*-
import io

CSS = ('<style>.bt-tldr{background:#eef6f4;border:1px solid #bfe0d9;border-left:4px solid #00695c;'
       'border-radius:8px;padding:1.1rem 1.3rem;margin:0 0 2rem}'
       '.bt-tldr-h{font-size:.82rem;letter-spacing:.12em;font-weight:800;color:#00695c;margin-bottom:.55rem}'
       '.bt-tldr ul{margin:0;padding-left:1.25rem}'
       '.bt-tldr li{margin:.35rem 0;font-size:.97rem;line-height:1.7;color:#2a3b38}'
       '.bt-tldr li::marker{color:#00695c}</style>')

DATA = {
 "zombie-vape.html": ("post-body", [
   "「喪屍煙彈」的核心成分不是大麻，而是手術室用的靜脈麻醉劑「依託咪酯」——吸一口等於自己打麻醉。",
   "它同時攻擊兩處：壓制大腦（意識不清、肌躍抽動），又抑制腎上腺（壓力荷爾蒙分泌不足）。",
   "危險常在事後才浮現，有遲發性症狀；文末附給家長的辨識清單。"]),
 "2026-guideline.html": ("article-body", [
   "溶栓藥物多了新選擇、取栓手術的時間窗擴大到 24 小時。",
   "「睡醒才發現中風」也可能還能治療——不要因為不確定發作時間就放棄送醫。",
   "取栓後血壓控制更嚴格、救護車上就能提前啟動治療：把握時間最關鍵。"]),
 "golden-hour.html": ("article-body", [
   "用 FAST 快速辨識中風：臉歪、手無力、講話不清，就要立刻行動。",
   "立刻打 119、記下「最後正常的時間」；不要自己開車、不要亂吃藥或喝水。",
   "症狀「自己消失」不代表沒事，可能是小中風（TIA）的警訊，仍要就醫。"]),
 "fabry-what-is.html": ("article-body", [
   "法布瑞氏症是天生少一把「清潔工」酵素，讓脂肪堆積在全身血管。",
   "男女都會發病；女性症狀可能較輕、酵素檢查甚至正常，容易被漏掉。",
   "它會同時傷害心、腎、腦與神經，症狀雜，常被當成別的病。"]),
 "fabry-early-signs.html": ("article-body", [
   "典型早期警訊常從小開始：手腳灼熱刺痛、不太流汗、皮膚小紅點、反覆腹痛。",
   "判斷原則：這些症狀「多個一起出現」時，就該提高警覺。",
   "確診其實不難——抽血驗酵素或基因即可，及早檢查能保住器官。"]),
 "fabry-young-stroke.html": ("article-body", [
   "脂肪堆在血管壁，讓全身血管提早老化、受損。",
   "中風可能是疾病的第一個嚴重警訊，好發在 20–50 歲的年輕族群。",
   "腎臟從「蛋白尿」開始無聲受害，早期常沒有感覺。"]),
 "fabry-family-screening.html": ("article-body", [
   "法布瑞是遺傳病，一人確診往往代表家裡還有人帶因。",
   "提早找到帶因者，就能在器官壞掉前開始治療、保住功能。",
   "家人可循「家族檢查（cascade screening）」逐一檢驗，及早布局。"]),
 "fabry-treatment.html": ("article-body", [
   "兩大類治療：補充酵素（酵素替代療法）或穩定酵素（口服小分子藥）。",
   "最重要原則：越早治療效果越好——在器官受損前介入。",
   "治療不只是打針吃藥，還包括器官保護與長期追蹤。"]),
}

for fn, (cls, bullets) in DATA.items():
    h = io.open(fn, encoding="utf-8").read()
    if "bt-tldr" in h:
        print(fn, "already has TL;DR, skip"); continue
    anchor = '<div class="%s">' % cls
    if anchor not in h:
        print(fn, "anchor NOT found:", anchor); continue
    box = ('\n\n<div class="bt-tldr">\n  <div class="bt-tldr-h">⚡ 重點先看</div>\n  <ul>\n'
           + "".join("    <li>%s</li>\n" % b for b in bullets)
           + "  </ul>\n</div>\n" + CSS)
    h = h.replace(anchor, anchor + box, 1)
    io.open(fn, "w", encoding="utf-8").write(h)
    print(fn, "injected")
