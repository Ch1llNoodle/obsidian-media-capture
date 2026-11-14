### Media Capture 0.15.1

Separate configuration defaults and validation from media parsing, and make credential and rule editors depend on a small settings interface. Configuration types distinguish shareable preferences from local credentials and derived fields. Both README files explain which rules, templates, and paths can be shared.

Move platform metadata requests into a dedicated module. Cover comparison reuses image reads within each capture operation and computes filename digests only for naming conflicts, without adding a persistent cache.

The stored settings and record formats remain unchanged. Keep data.json and records.json when updating. Build and type checks pass; 114 automated tests pass and three optional vault integration checks are skipped. Local ESLint validation remains blocked by the execution environment; the release workflow runs its own lint check before publishing assets.
