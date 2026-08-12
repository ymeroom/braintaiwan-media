# BrainTaiwan Media

This repository contains the BrainTaiwan media site and generated article
assets.

Read `MEMORY.md` for durable editorial and presentation decisions. Do not use
session logs as project policy.

## Working rules

- Preserve `CNAME` and the existing static-site structure.
- Treat files under `posts/` and `fb/` as public-facing content.
- Inspect the relevant `build-*-media.js` script before changing generated
  output.
- After editing JavaScript, run `node --check <file>` on each changed script.
- Preview public-facing changes before publishing or deploying them.
- Do not publish, deploy, schedule, or post externally without the user's
  explicit approval in the current conversation.
- Never print or persist access tokens.

## Daily morning-brief: two mandatory gates

Any session writing a daily article — including the automated cloud routine —
MUST pass both gates. Full rules and formats: `docs/daily-pipeline.md`.

**Gate 1 — topic must not repeat within 7 days.** Before searching for a
topic, run `node topic-guard.js`; it lists the topic groups blocked by the
cooldown and the groups available. Do not write about a blocked group, even
if it is the day's hottest news — hot news clusters, which is exactly what
the cooldown counteracts. Validate the candidate with
`node topic-guard.js --check "<題目>"` (exit 0 required) before writing, and
record the group in the `topic:` front-matter field of `_src/<slug>.md`
(comma-separated for a piece that genuinely spans two groups).

**Gate 2 — citations must be complete.** Every journal reference in
`## 參考來源` needs authors, a quoted title, the italicized full journal
name, the year, volume(issue):pages, and a DOI or PMID. A journal name plus
a title is not enough, and PubMed / PMC / ScienceDirect / Oxford Academic are
databases, not journal names. Verify identifiers against the journal page,
the DOI, or PubMed; if a study's identifiers cannot be verified, drop the
citation rather than approximating it. Cite the original paper for study
data — the news story reporting it may be listed additionally, never
instead. Run `node check-citations.js _src/<slug>.md` and fix every ❌
before building; it must exit 0.

## `main` moves on its own

A daily cloud routine ("Daily morning-brief") commits and pushes to `main`
without any local session running. It adds a `_src/*.md`, a `posts/*.html`, an
`fb-drafts/*.md`, **a card in `index.html`**, and regenerates `sitemap.xml`.

GitHub Pages serves `main` at the repo root, so `main` is production. Pushing a
feature branch publishes nothing.

- Run `git fetch origin` and check `git log origin/main..HEAD` **before**
  starting work and again before merging. A branch left overnight is already
  behind; one left a week is behind by a week of daily commits.
- Never assume a merge to `main` is a fast-forward. Verify with
  `git log --oneline origin/<branch>..origin/main | wc -l` — a non-zero count
  means `main` moved.
- `index.html` is the collision point: article cards are maintained by hand
  *and* appended by the routine. After any merge touching it, confirm the card
  count equals both sides' additions and grep for a few of the routine's recent
  slugs to prove none were dropped.
- `sitemap.xml` conflicts are not worth resolving by hand — it is a build
  product. Take either side, then regenerate with `node seo-build.js`.
- Verify a publish against the live URL with a cache-busting query
  (`https://media.braintaiwan.com/?cb=<something>`); the CDN will otherwise
  serve the previous `index.html` and make a good deploy look failed.
