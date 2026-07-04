# Durable Project Memory

This file contains stable decisions shared by Claude Code and Codex. It does
not contain session history, credentials, post IDs, schedules, or commit IDs.

## Build Workflow

- `build-*-media.js` regenerate post HTML from source markdown but do NOT emit
  the JSON-LD `<script type="application/ld+json">` (Article schema). That
  structured data is injected in a separate post-build pass by
  `enhance-article-seo.js`. Therefore: after running any `build-*-media.js`,
  ALWAYS run `node enhance-article-seo.js` (and `node seo-build.js` for the
  sitemap) or the rebuilt posts silently lose their SEO schema.
- A rebuild also overwrites every other output of that build script, not just
  the article you changed — commit only the intended files, and discard churn
  in siblings (e.g. the soy/milk set share `build-milk-media.js`).

## Audience And Editorial Style

- Write public-health content for a general audience in Traditional Chinese.
- Favor plain-language, Feynman-style explanations while preserving medical
  accuracy and uncertainty.
- Optimize public pages for older readers: readable type, clear hierarchy,
  generous targets, and straightforward mobile layouts.
- Do not turn educational content into individualized medical advice.
- Standard article closer: end the narrative with a
  `> ### 🩺 神經專科 施懿恩醫師觀察` blockquote (renders as `.commentary`).
  It must close on an observation or an open question — never a summary, a
  call-to-action, or an uplifting appeal. Practical "what to do" content
  belongs in a structured 就醫指引 box or section, not in the closer.
- Standard sources format: a formal `## 參考來源` section (bulleted list)
  after the closer, before the italic disclaimer line. Inline-only attribution
  is not sufficient for articles that cite numbers or studies.
- All public copy must pass `D:\claudecode\BRAND_STYLE_GUIDE.md` (vocabulary
  blacklist, 三不 rules, pre-publish checklist) before publishing.

## Social Content

- Carousel is the default BrainTaiwan Facebook format. Prefer an ordered set of
  4-7 educational cards when the content supports that range.
- Reusable carousel visual presets live in `fb-drafts/carousel-style-presets.md`,
  including Preset 03 blackboard teaching and Preset 07 premium minimalist.
- Use Preset 03 blackboard teaching as the default for the future Facebook
  backlog unless the user requests another style. The current reusable source
  and preview live in `fb-drafts/blackboard-carousel/`.
- Use a single-image, link, or text-only post only when explicitly requested or
  when suitable multi-image assets genuinely cannot be produced.
- Review the caption and numbered image order together before dry-run; any
  later image or order change requires a new preview.
- Keep publishing and scheduling behind explicit user approval after preview.
- Keep tokens and page credentials in Windows User environment variables only.

## Memory Hygiene

- Promote a decision here only when it is expected to remain useful across
  sessions.
- Keep daily activity, authentication incidents, post schedules, logs, PID
  files, and temporary state in their original systems; do not sync them here.
