# Durable Project Memory

This file contains stable decisions shared by Claude Code and Codex. It does
not contain session history, credentials, post IDs, schedules, or commit IDs.

## Audience And Editorial Style

- Write public-health content for a general audience in Traditional Chinese.
- Favor plain-language, Feynman-style explanations while preserving medical
  accuracy and uncertainty.
- Optimize public pages for older readers: readable type, clear hierarchy,
  generous targets, and straightforward mobile layouts.
- Do not turn educational content into individualized medical advice.

## Social Content

- Carousel is the default BrainTaiwan Facebook format. Prefer an ordered set of
  4-7 educational cards when the content supports that range.
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
