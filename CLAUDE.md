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
