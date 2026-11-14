### Media Capture 0.15.2

Add Simplified Chinese, English, and French interface translations for settings, commands, dialogs, notices, and plugin-generated errors. Obsidian 1.8.7 and newer follows the application language; other languages and older versions use English. Reload the plugin after changing language to refresh command names.

Translation catalogs and placeholder substitution are maintained separately from feature code. Existing templates, rule names, credential fields and values, note content, and stored status identifiers remain unchanged. External service and system errors retain their original text.

Build and type checks pass; 119 tests pass and three optional vault integration checks are skipped. Tests cover all three interface languages and catalog completeness. Local ESLint remains blocked by the execution environment; the release workflow runs lint before publishing.

Keep data.json and records.json when updating.
