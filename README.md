### Media Capture

[简体中文](README.zh-CN.md) · English

Media Capture applies Markdown templates to podcast and video information from Douban, Xiaoyuzhou, Apple Podcasts, YouTube, and Bilibili. Configurable rules append content to existing files or create new files, supporting one-line logs, one file per episode, and one file per show. The default remains one line per episode. Daily integration and links to work wishlists are optional. The interface currently uses Chinese.

#### Installation

For iPhone and desktop testing, install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's community plugins, then add `Ch1llNoodle/obsidian-media-capture` as a beta plugin. Choose a published release or prerelease and enable Media Capture. BRAT installs and updates the release files inside Obsidian.

Obsidian 1.5.0 or later is required. Place `main.js`, `manifest.json`, and `styles.css` in `<Vault>/.obsidian/plugins/media-capture/`, then enable **Media Capture** under **Settings → Community plugins**. Source builds place these files in `release/media-capture/`.

When updating, replace those three files and reload the plugin. Keep the existing `data.json`, which stores rule settings, output indexes, captured metadata, and the latest cover repair report.

Version 0.10 installs under the `media-capture` identity. Existing users must install this identity and synchronize explicitly converted configuration and records before enabling it. Commands, events, properties, management markers and backups use the media namespace; there are no old-name aliases. Platform record IDs and source links remain unchanged.

#### Capture media

1. Open the command palette and run **Media Capture: 采集媒体** (add podcast).
2. Paste a podcast or video share link and select **获取媒体信息** (fetch episode information).
3. Confirm the show, episode title, listening date, state, and write preset, then select **保存** (save).

States are `听过` (listened), `在听` (in progress), and `想听` (wishlist). Only listened entries receive a listening date. The date is entered manually; the plugin does not import playback history. With daily integration enabled, opening the dialog from a dated note in the configured daily folder uses that note's date.

For Apple Podcasts, share an individual episode. A show URL without an `i` episode parameter is rejected. If metadata cannot be fetched, enter the title manually. A failed cover download does not prevent saving.

**打开媒体记录** opens the configured log. **补全缺失封面** retries missing covers and reports the failure stage; when an image URL is available, the report links to the original image.

#### Video records and optional playback

Video rows use a separate configured log: `Videos.md` by default, or another explicitly configured vault path. File names are not inferred from path language. Both logs share the row template and heading. Independent notes and show/channel append outputs continue using their own rules.

YouTube watch, shorts, live, embed and youtu.be links and full Bilibili BV/av links are supported. Bilibili parts remain separate records. Open short links first to copy the full address. Tracking parameters and start times are removed. Missing metadata can be entered manually.

Play in Obsidian is disabled by default. Configure a compatible player supporting `obsidian://mx-open`, then opt in. Video rows gain a playback action and templates can generate `{{mediaLink}}` and `{{mediaUrl}}`. Disabled playback leaves these variables empty for new or explicitly refreshed content; platform links remain available. Podcast landing pages do not receive playback links. Playback and timestamps belong to the external player. Bilibili requires a desktop web playback environment. Actual playback and mobile video capture remain pending device verification.

#### Templates and write rules

All outputs use the same episode metadata and template variables. Each write rule selects a template, a vault path, and either **append to file** or **create file**. Multiple enabled rules run for one capture, sharing one cover download and one daily-note link.

| Preset | Destination | Content |
| --- | --- | --- |
| 集中清单 | Append under Entries in `Podcasts.md` for podcasts or `Videos.md` for videos | One list row |
| 每条一篇 | Create `Media/{{show}}/{{title}}.md` | An episode note |
| 清单与独立笔记 | Run the two rules above | A row and a note |
| 按节目／频道追加 | Append under Episodes in `Media/{{show}}.md` | Multiple episode sections in one show file |

In settings, apply a preset or edit individual rules: name, enabled state, write method, folder, path template, target heading, template file, inline content, and cover width. Rules can be added or removed, up to 20. Applying a preset replaces rule configuration and keeps existing files. In the capture dialog, **使用已启用规则** runs the configured rules; a named preset overrides the selection for that capture.

A fixed path collects episodes in one file; `{{show}}.md` groups them by show; `{{show}}/{{title}}.md` creates one file per episode when used with create mode. Empty folders use the vault root. Missing shows use Unsorted. Unsupported filename characters are replaced. Create mode reopens an identified episode file or adds an ID suffix for a foreign filename collision. Append mode reuses the target file and creates it when absent; an existing file must contain the configured heading, unless the heading is empty. Two enabled rules targeting the same file are rejected before writing.

The concentrated log rule preserves a fixed path, target heading, and single-line list template containing `{{link}}` so existing daily links and work associations remain usable. Other append rules accept multiline Markdown. Their managed episode regions are delimited by `media-entry` comments. Keep those comments and block IDs; handwritten content outside the regions remains intact. Live Preview hides these management markers in tracked output files. A repeated capture preserves an existing completed region. A state transition stops if the region has been edited manually.

Select a vault Markdown file for a rule, or leave the file path empty to use its inline content. Create templates may include YAML properties; append templates contain body Markdown. Templater and JavaScript are not executed.

| Variable | Value |
| --- | --- |
| `{{show}}`, `{{title}}` | Show and episode title |
| `{{fullTitle}}`, `{{link}}` | Combined show/title text, or its Markdown episode link |
| `{{mediaLink}}`, `{{mediaUrl}}` | compatible player video link or URI; empty for podcast pages |
| `{{kind}}`, `{{consumed}}` | `video` or `podcast`, and completed viewing/listening date |
| `{{url}}` | Canonical platform episode URL |
| `{{cover}}`, `{{coverPath}}` | Local Markdown image at the rule's width, or its vault path; empty without a cover |
| `{{published}}` | Publication date supplied by the platform |
| `{{listened}}` | Selected listening date for 听过; empty for other states |
| `{{currentDate}}`, `{{date}}` | Local date of the episode's first generated record; retained during template updates |
| `{{description}}` | Available platform description or manually entered text |
| `{{state}}`, `{{provider}}`, `{{id}}` | State, platform, and stable episode identifier |

Date formats support YYYY, MM, and DD, for example `{{published:YYYY-MM-DD}}`. Paths accept show, title, published, listened, currentDate, date, provider, and id; use literal slashes between subfolders. Missing optional values remain empty in content and use Untitled in filenames. Cover width is 16–600 pixels; preset rows use 24 and episode sections use 120.

A row template can be `- {{listened}} {{cover}} {{link}}`. A multiline append template can contain a title, link, description, and your own section headings. For create mode, a Markdown template may include properties:

```markdown
---
show: "{{show}}"
published: "{{published}}"
listened: "{{listened}}"
tags: [podcast]
---
### {{title}}

{{cover}}

[Episode](<{{url}}>)

#### Notes

#### Quotes
```

**创建媒体笔记** opens the capture dialog with the per-episode preset. **写笔记** beside a log row preselects that episode; **打开笔记** reopens its primary episode note. The log also keeps a link to the first additional output, including a show file when selected. Reading mode and the editor provide row actions without hotkeys. Work associations and log-based tracking still use the concentrated log rule; arbitrary output files are not automatically included by external trackers.

Every created file contains both `media_capture_id` and `media_capture_rule`. Output indexes use the single `ruleId::recordId` key format. Append indexes follow file renames; if a tracked file or its region disappears, saving reports the missing target rather than recreating it elsewhere. Keep data.json with the vault for cross-device continuity.

#### Apply templates to existing records

Template edits apply to new records by default. Use **将模板应用到已有记录 → 预览并选择** in settings, or the command of the same name, to preview updates and select files.

Create outputs are regenerated in full, including properties and handwritten sections. Append outputs replace only managed rows or episode regions, retaining surrounding text, work children, and quotations. A show file containing several episodes is updated once and backed up once. File names and locations remain unchanged.

Before replacing a file, the plugin saves and verifies a timestamped text backup beside it with the `.media-capture-backup` extension. Results provide **查看备份** inside Obsidian; copy the original text back to restore it. Keep backups until no longer needed.

Stored capture metadata retains dates and descriptions; explicit properties in current notes can override it. Template updates require this metadata and do not reconstruct old notes from links, headings or log text. Missing optional fields are shown before updating. Missing essential links, duplicate identities, removed rules, and damaged region markers produce errors. No network requests are made during template updates.

Reports identify each file, failed stage, reason, update status, and backup path. Files changed after preview are skipped. Backup failure prevents replacement; other selected files can still finish. Identical content creates no new backup. Closing a running update dialog does not cancel queued work.

#### Link works to podcast episodes

Mark a work as wanted on Douban, then import it into a Markdown collection with your own Douban sync tool. Set the six collection paths to your existing books, movies, series, music, games, and theater lists. Defaults are under `Recommendations/`; this plugin reads existing files only.

In the podcast log (editing or reading mode), select **添加关联** beside an episode. That episode is fixed as the source. Choose a wanted work from the dropdown, optionally enter an excerpt, and select **保存关联**. Only works marked 想读, 想看, 想听, or 想玩 for their respective media types are offered; in-progress, completed, and unmarked works are excluded. There are no search fields or source-episode selector. The **打开媒体关联入口** command opens the podcast log.

The work row links to its source episode, and linked works and optional excerpts appear as indented child list items beneath the podcast, without a recommendation label. Work-management markers are inline comments rather than separate lines. Live Preview hides internal status, work markers, and block IDs in the podcast log only; source mode retains the Markdown. Media collection presentation is managed independently by Obsidian styles or other tools. Reading mode uses a scoped nested-list layout. Titles, dates, states, and covers stay intact. Multiple episodes share one work row; selecting the same episode again adds no duplicate. Linking works entirely offline: it does not search Douban, fetch subject pages, download work covers, create work notes or wishlist entries, or write daily properties. The work and source are checked again before saving. Each note is updated separately; if the second write fails, the dialog reports which side was saved. Saving again completes the missing side without duplication. After layout is ready, existing work-side associations also restore missing podcast-row links, including works that have since been completed.

Collections use single-line Markdown list entries, for example:

```markdown
- [Work title](<https://movie.douban.com/subject/123/>) <!-- douban-state: 想看 --> <!-- douban-type: movie --> ^douban-123
```

`douban-type` accepts `book`, `movie`, `teleplay`, `music`, `game`, and `theater`; without it, the configured collection type is used. The optional `media-capture:recommend` workspace event accepts `{ path, blockId }` to preselect a source episode; `supportsRecommendations` indicates support.

Custom sync tools must preserve the span between `media-sources:start` and `media-sources:end` when rewriting a matching work. Douban collection synchronization is handled by external tools.

#### Settings

| Setting | Default | Behavior |
| --- | --- | --- |
| Write rules | Concentrated log enabled | Presets or independently configured append/create rules |
| Cover folder | `image/media` | Shared local cover directory |
| Download covers | Enabled | Downloads missing covers when capturing or repairing |
| Repair on startup | Disabled | Repairs concentrated-log covers after layout is ready |
| Daily integration | Disabled | Links listened episodes to exactly one existing dated note |
| Daily folder / property | `Daily` / `media` | Searches subfolders; preserves other properties |
| Collection paths | Files under `Recommendations/`: `Books.md`, `Movies.md`, `Series.md`, `Music.md`, `Games.md`, `Theater.md` | Existing wanted-work collections |

Daily integration creates no daily notes. When the concentrated log rule runs, its block link is used; otherwise the first additional output supplies the link, including an episode anchor in a show file. A note created from an existing log row keeps the existing activity source. Changing rule paths affects new outputs and does not move existing files.

#### Record identity and repair

Artwork filenames use the podcast show name when available, or the record title; videos use their title. Invalid characters become underscores, and different artwork with the same name receives an eight-character suffix. Cached image URLs reuse their files. New URLs are compared byte-for-byte only with artwork referenced by configured logs, captured metadata or the URL cache. Other attachments are not enumerated, renamed or deleted. Bulk attachment maintenance belongs to the vault. Recompressed, cropped and resized variants remain separate; shared artwork does not merge episode identities.

The plugin appends media-state and media-date comments and an Obsidian block identifier. These markers support deduplication, cover repair, and daily note links. Keep them when editing records manually. Notes and quotations outside the episode row are preserved.

Episodes from the same platform are matched by episode ID. Across platforms, records are reused only when the full `show · episode` title matches after case, whitespace, and Unicode normalization. A completed record keeps its original date. Recording a repeat listen on another date requires daily integration and exactly one existing note for that date; the original log row is retained.

#### Data format and vault integration

Daily sections, activity summaries, completion styling and personal collection presentation belong to vault scripts or configuration. The plugin exposes optional paths, templates, daily fields and workspace events; it does not hardcode personal directories or diary titles or rewrite work labels based on completion. Existing handwritten formatting is preserved.

The output is ordinary Markdown. Dataview and other tracking plugins are optional. After saving, the plugin emits `media-capture:updated` with `path`, `blockId`, `state`, and `date`. Note captures also include `notePath` and `output`; `blockId` is empty when no log row exists. `CaptureUpdatedEvent` in `src/types.ts` defines the payload. Log-only tracking integrations do not automatically count standalone notes.

Version 0.10 accepts only the current data schema (`schemaVersion: 2`) and `writeRules`. Retired flat settings, old state/date parsing, unscoped output indexes and old inline association blocks are not migrated. Unknown settings and unsupported data formats produce explicit errors without rewriting the saved data.

Before upgrading an existing installation, back up data.json and the affected notes. Start with fresh settings or explicitly convert the data outside the plugin; synchronize the converted configuration and records to other devices before loading 0.10. No migration script ships with the plugin. Template refresh requires captured metadata; missing metadata is reported per file.

#### Development and validation

Runtime source files are TypeScript. The compiler enables `strict`, unchecked indexed access checks, explicit override checks, and unused declaration checks; JavaScript source inclusion is disabled. ESLint rejects explicit `any` and unsafe assignments, arguments, calls, member access, and returns in runtime code. Persisted data and third-party JSON enter as `unknown` and are narrowed before use.

`src/main.ts` manages lifecycle and commands. `capture-output.ts` executes one shared capture pipeline; `capture-context.ts` handles cover retrieval and the daily link once per capture. `write-rules.ts` validates rules and resolves presets, and `note-format.ts` renders shared variables. `episode-notes.ts` and `append-output.ts` implement create and append destinations. `refresh-plan.ts` builds per-file template updates, and `note-refresh.ts` applies them with verified backups. The service, settings UI, platform parsers, and vault helpers retain separate responsibilities. Runtime contracts are defined in `types.ts`.

```sh
npm ci
npm run typecheck
npm run build
npm test
npm run lint
```

The production build bundles runtime code into `release/media-capture/main.js` and stages the manifest and stylesheet alongside it. Tests bundle TypeScript modules with esbuild and execute them against mocked Obsidian APIs. An optional tracker compatibility test uses the script path provided by `MEDIA_TRACKER_TEST_PATH`; it is skipped when that variable is absent. `MEDIA_DOUBAN_SYNC_TEST_PATH` enables an additional integration test against a custom Douban sync view. `MEDIA_WORK_PRESENTATION_TEST_PATH` can point to an independent vault presentation script to verify completion markers and cleanup without Capture.

Release files are `main.js`, `manifest.json`, and `styles.css`. Generated bundles, dependencies, and personal `data.json` are excluded from source control. Dependency security checks use `npm audit` separately from compilation and functional tests.

Pushing a tag that matches the manifest and package versions runs the release workflow. After build, test, and lint checks pass, it uploads the runtime files and publishes a GitHub prerelease for BRAT. This workflow does not submit the plugin to the community catalog.

#### Local development and deployment

Keep the source repository separate from the installed plugin directory. If the source is inside a vault, ignore that directory in the outer vault Git repository while keeping the installed plugin and its settings in the vault backup. The `release/media-capture/` directory contains generated installation files; the vault installation remains under `.obsidian/plugins/media-capture/`.

Copy `.deploy.example.json` to `.deploy.local.json` and set `vaultPath` to the absolute path of an existing vault. Run `npm run deploy` to build and copy the runtime files, then reload Media Capture in Obsidian. `npm run deploy -- --vault /absolute/path/to/vault` overrides the local configuration; `MEDIA_CAPTURE_VAULT` is also supported. Resolution order is command argument, environment variable, then local configuration.

Deployment copies only main.js, manifest.json, and the optional styles.css. It preserves data.json and other installation files, checks the plugin ID and staged version, and rejects deployment into a source repository or through symbolic-link installation directories. Local deployment configuration and release output are excluded from Git. `npm run dev` watches the source and updates the staged files; it does not deploy automatically.

#### Network access and mobile support

YouTube metadata requests use `www.youtube.com/oembed`; Bilibili requests use its public video pages. Douban and Xiaoyuzhou metadata requests go to the selected episode's public page. Apple Podcasts first uses the public iTunes Lookup API at `itunes.apple.com`, matching the exact episode ID and storefront from the shared link, then falls back to the episode webpage. No Apple login or token is used. Catalog results are limited to 200 episodes per show; an older episode may need the webpage fallback or a manually entered title. Cover downloads are restricted to HTTPS hosts under `doubanio.com`, `xyzcdn.net`, `mzstatic.com`, `ytimg.com`, and `hdslb.com`. Saving may fetch a missing cover even when the title was entered manually; disabling cover downloads prevents those image requests. Manual repair and optional startup repair also fetch episode pages when needed. Linking works and episodes reads configured local lists only and makes no network requests.

Runtime code uses Obsidian APIs and standard Web APIs, with no Node.js or Electron dependency. Android and iOS loading is enabled in the manifest; real-device compatibility remains unverified. The plugin does not read platform credentials or playback history and does not include telemetry. Platform or network failures appear in the dialog or cover repair report.

#### License

[Zero-Clause BSD](LICENSE).
