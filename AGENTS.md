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
