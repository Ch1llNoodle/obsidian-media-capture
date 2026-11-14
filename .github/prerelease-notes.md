### Media Capture 0.16.0

Use language-independent media status identifiers: completed, in-progress, and wishlist. Labels remain localized in Chinese, English, and French; events and the {{state}} template variable use the fixed identifiers.

Settings use schema version 3 and capture records use schema version 2. Douban work-collection statuses remain unchanged.

State validation and display live in media-state.ts. Tests cover localized labels, canonical persistence, and validating stored data without overwriting damaged files. Build and type checks pass; local ESLint remains blocked by the execution environment.
