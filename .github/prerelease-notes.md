### Media Capture 0.12.0

Maimemo study progress is an optional Capture integration. Configure the token in the plugin settings using the masked input. Vault views can call fetchStudyProgress() to retrieve progress and separate completed new-word and review-word counts.

Completed counts are verified against the daily word list before returning. Incomplete, duplicate or truncated results produce an error. A temporary HTTP 503 is retried once after one second.

Requests use Obsidian's request API. No background polling or study-result cache is added. Diary sections, date guards, daily snapshots and heatmaps remain vault-owned. Existing media capture and storage formats are unchanged.

Validation: production build passes; 118 tests pass and 3 optional vault integration tests are skipped. ESLint retains one existing settings-search warning.
