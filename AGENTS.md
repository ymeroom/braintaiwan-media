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

- **Topic must not repeat within 7 days.** Run `node topic-guard.js` before
  choosing a topic; do not write about a blocked topic group even if it is the
  day's hottest news. Validate with `node topic-guard.js --check "<題目>"`
  (exit 0 required) and record the group in the `topic:` front-matter field.
- **Citations must be complete.** Journal references need authors, quoted
  title, italicized full journal name, year, volume(issue):pages, and a DOI or
  PMID; databases (PubMed, PMC, ScienceDirect) are not journal names. Verify
  identifiers, drop unverifiable studies, and cite the original paper rather
  than the news story about it. `node check-citations.js _src/<slug>.md` must
  exit 0 before building.
