### Media Capture 0.8.3

#### Scope and cleanup

Personal diary sections, completion styling and bulk attachment maintenance belong to the vault. Capture uses explicit saved settings and generic defaults; it no longer probes personal directories or guesses video filenames from path language. Existing saved paths, templates, command IDs and the released plugin ID remain compatible.

Artwork reuse now considers only images referenced by configured Capture logs, captured metadata or the URL cache. Unrelated attachments are not enumerated. Readable filenames and byte-for-byte cross-platform reuse remain available.

Removed or consolidated duplicate file guards, repeated URL parsing, an unused fingerprint calculation and the separate small collection-parser file. Internal service names now match Media Capture. The vault can maintain completed-work formatting independently when Capture is disabled.

#### Validation

107 automated tests cover capture, legacy configuration inputs, template updates, cross-platform artwork reuse, unrelated-attachment isolation, association formatting preservation, independent vault presentation and deployment. Strict TypeScript and production builds pass. ESLint retains one existing settings-search warning. Actual mobile interface and playback behavior still require device validation.

Update only main.js, manifest.json and styles.css; keep data.json. The released plugin ID remains podcast-capture.
