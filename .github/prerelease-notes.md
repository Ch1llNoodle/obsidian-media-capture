### Media Capture 0.11.0

Settings now live alone in data.json (schema version 3). Durable capture metadata and output indexes live in records.json (schema version 1). Cover URL caches and repair reports are no longer persisted; artwork reuse reads existing log and record references.

Capture metadata stores source fields once. Links, image markup, platform identifiers and date aliases are reconstructed when loading. Record updates use a verified temporary file; unchanged data is not rewritten.

Keep both data.json and records.json when syncing devices. Existing combined settings must be converted outside the plugin before loading this version. No runtime compatibility or automatic migration is included.
