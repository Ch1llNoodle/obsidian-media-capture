### Media Capture 0.9.0

#### Breaking data-format change

This release removes backward-compatibility code. It accepts only schemaVersion 1 with writeRules, explicit note rule IDs and ruleId::recordId output indexes. Retired flat settings, old state/date fallbacks, inline association migrations and reconstruction of old notes from body text are removed. Unsupported data produces explicit errors without automatically rewriting the saved configuration.

Back up data.json and the affected notes before upgrading. Rebuild or explicitly convert the data outside the plugin, then synchronize the current-format data to your other devices. The plugin does not ship an automatic migration path. The existing installation ID remains podcast-capture; that is the installation identity, not a legacy parsing layer.

#### Current behavior

Capture, templates, configurable write rules, separate podcast/video logs, readable shared artwork, associations and optional playback remain available. Daily sections, completion styling and bulk attachment maintenance belong to vault scripts. All output types use the same capture metadata; template refresh rejects records whose captured metadata is missing.

#### Validation

107 tests cover current-format capture, template updates, artwork reuse, strict old-schema rejection, explicit output indexes, independent vault presentation and deployment. Strict TypeScript and production builds pass. Actual mobile interface and playback behavior still require device validation.
