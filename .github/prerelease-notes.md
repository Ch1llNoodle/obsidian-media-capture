### Media Capture 0.10.0

#### Plugin identity reset

The installation ID is now media-capture. Runtime files install in .obsidian/plugins/media-capture and build into release/media-capture. Commands, workspace events, note properties, management markers, backup extensions and CSS use the media namespace. Deployment uses MEDIA_CAPTURE_VAULT. No old-name aliases or in-plugin migration code are included.

Saved data must use schemaVersion 2. Existing users must reinstall the new identity and synchronize explicitly converted data and records before enabling it; merely renaming a directory is insufficient. Keep a copy of personal data.json outside the source repository. Source builds and releases never include personal configuration.

#### Validation

Capture, write rules, template updates, shared artwork, associations and optional playback remain available. Tests cover deployment destinations, stable record identities, current data validation and the independent vault presentation script. Actual mobile installation and playback require device verification.
