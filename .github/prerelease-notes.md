### Media Capture 0.15.0

Replace fixed service settings with one custom-credentials list. Add, rename, edit, and delete user-defined field/value pairs. Values are masked in settings and stored as plain text in data.json.

Vault scripts use getCredential(name) to retrieve a value. Missing fields return an empty string; calls before initialization or after unload fail. Lookup does not make network requests.

Remove the built-in study, TV, and place service clients and their fixed settings and methods. API request code, validation, records, and views belong to vault configuration. The plugin does not migrate old settings. Existing capture, cover, work-association, and template features remain available.
