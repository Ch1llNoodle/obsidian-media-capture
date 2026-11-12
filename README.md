### Media Capture

[简体中文](README.zh-CN.md) · English

Media Capture saves podcast and video information from Douban, Xiaoyuzhou, Apple Podcasts, YouTube, and Bilibili as Markdown. Write rules support one-line logs, separate notes, and files grouped by show or channel. The default is one line per record, with separate podcast and video logs. Daily integration, work associations, and in-app playback are optional. The interface currently uses Chinese.

#### Installation

For iPhone and desktop testing, install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's community plugins, then add `Ch1llNoodle/obsidian-media-capture` as a beta plugin. Choose a published release or prerelease and enable Media Capture. BRAT installs and updates the release files inside Obsidian.

Obsidian 1.5.0 or later is required. Place `main.js`, `manifest.json`, and `styles.css` in `<Vault>/.obsidian/plugins/media-capture/`, then enable **Media Capture** under **Settings → Community plugins**. Source builds place these files in `release/media-capture/`.

When updating, replace those three files and reload the plugin. Keep both `data.json` (settings) and `records.json` (capture records).

The plugin ID and installation directory are `media-capture`. Configuration requirements for installations predating 0.11 are described under Data format and vault integration.

#### Capture media

1. Open the command palette and run **Media Capture: 采集媒体** (capture media).
2. Paste a podcast or video share link and select **获取媒体信息** (fetch media information).
3. Confirm the show or channel, title, record date, state, and write preset, then select **保存** (save).

Podcast states are `听过` (listened), `在听` (in progress), and `想听` (wishlist). Videos display `看过` (watched), `在看` (in progress), and `想看` (watchlist). Completed records receive the selected date. With daily integration enabled, opening the dialog from a dated note in the configured daily folder uses that note's date.

For Apple Podcasts, share an individual episode. A show URL without an `i` episode parameter is rejected. If metadata cannot be fetched, enter the title manually. A failed cover download does not prevent saving.

**打开媒体记录** opens the configured log. **补全缺失封面** retries missing covers and reports the failure stage; when an image URL is available, the report links to the original image.

#### Video records and optional playback

Video rows use a separate configured log: `Videos.md` by default, or another configured vault path. Both logs share the row template and heading. Independent notes and show/channel append outputs use their own rules.

YouTube watch, shorts, live, embed and youtu.be links and full Bilibili BV/av links are supported. Bilibili parts remain separate records. Open short links first to copy the full address. Tracking parameters and start times are removed. Missing metadata can be entered manually.

Play in Obsidian is disabled by default. Configure a compatible player supporting `obsidian://mx-open`, then opt in. Video rows gain a playback action and templates can generate `{{mediaLink}}` and `{{mediaUrl}}`. Disabled playback leaves these variables empty for new or explicitly refreshed content; platform links remain available. Podcast landing pages do not receive playback links. Playback and timestamps belong to the external player. Bilibili requires a desktop web playback environment. Actual playback and mobile video capture remain pending device verification.

#### Templates and write rules

All outputs use the same media metadata and template variables. Each write rule selects a template, a vault path, and either **append to file** or **create file**. Multiple enabled rules run for one capture, sharing one cover download and one daily-note link.

| Preset | Destination | Content |
| --- | --- | --- |
| 集中清单 | Append under Entries in `Podcasts.md` for podcasts or `Videos.md` for videos | One list row |
| 每条一篇 | Create `Media/{{show}}/{{title}}.md` | An episode note |
| 清单与独立笔记 | Run the two rules above | A row and a note |
| 按节目／频道追加 | Append under Episodes in `Media/{{show}}.md` | Multiple episode sections in one show file |

In settings, apply a preset or edit individual rules: name, enabled state, write method, folder, path template, target heading, template file, inline content, and cover width. Rules can be added or removed, up to 20. Applying a preset replaces rule configuration and keeps existing files. In the capture dialog, **使用已启用规则** runs the configured rules; a named preset overrides the selection for that capture.

A fixed path collects episodes in one file; `{{show}}.md` groups them by show; `{{show}}/{{title}}.md` creates one file per episode when used with create mode. Empty folders use the vault root. Missing shows use Unsorted. Unsupported filename characters are replaced. Create mode reopens an identified episode file or adds an ID suffix for a foreign filename collision. Append mode reuses the target file and creates it when absent; an existing file must contain the configured heading, unless the heading is empty. Two enabled rules targeting the same file are rejected before writing.

The concentrated log rule preserves a fixed path, target heading, and single-line list template containing `{{link}}` so existing daily links and work associations remain usable. Other append rules accept multiline Markdown. Their managed episode regions are delimited by `media-entry` comments. Keep those comments and block IDs; handwritten content outside the regions remains intact. Live Preview hides these management markers in tracked output files. A repeated capture preserves an existing completed region. A state transition stops if the region has been edited manually.

Select a vault Markdown file for a rule, or leave the file path empty to use its inline content. Create templates may include YAML properties; append templates contain body Markdown. Templates are rendered as text; embedded scripts are not executed.

| Variable | Value |
| --- | --- |
| `{{show}}`, `{{title}}` | Show and episode title |
| `{{fullTitle}}`, `{{link}}` | Combined show/title text, or its Markdown episode link |
| `{{mediaLink}}`, `{{mediaUrl}}` | Compatible player video link or URI; empty when playback is disabled or the source is a podcast page |
| `{{kind}}`, `{{consumed}}` | `video` or `podcast`, and completed viewing/listening date |
| `{{url}}` | Canonical platform episode URL |
| `{{cover}}`, `{{coverPath}}` | Local Markdown image at the rule's width, or its vault path; empty without a cover |
| `{{published}}` | Publication date supplied by the platform |
| `{{listened}}` | Selected completion date for listened or watched records; empty for other states |
| `{{currentDate}}`, `{{date}}` | Local date of the first generated record; retained during template updates |
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

Every created file contains both `media_capture_id` and `media_capture_rule`. Output indexes use the single `ruleId::recordId` key format. Append indexes follow file renames; if a tracked file or its region disappears, saving reports the missing target rather than recreating it elsewhere. Keep data.json and records.json with the vault for cross-device continuity.

#### Apply templates to existing records

Template edits apply to new records by default. Use **将模板应用到已有记录 → 预览并选择** in settings, or the command of the same name, to preview updates and select files.

Create outputs are regenerated in full, including properties and handwritten sections. Append outputs replace only managed rows or episode regions, retaining surrounding text, work children, and quotations. A show file containing several episodes is updated once and backed up once. File names and locations remain unchanged.

Before replacing a file, the plugin saves and verifies a timestamped text backup beside it with the `.media-capture-backup` extension. Results provide **查看备份** inside Obsidian; copy the original text back to restore it. Keep backups until no longer needed.

Stored capture metadata retains dates and descriptions; explicit properties in current notes can override it. Template updates require this metadata and do not reconstruct old notes from links, headings or log text. Missing optional fields are shown before updating. Missing essential links, duplicate identities, removed rules, and damaged region markers produce errors. No network requests are made during template updates.

Reports identify each file, failed stage, reason, update status, and backup path. Files changed after preview are skipped. Backup failure prevents replacement; other selected files can still finish. Identical content creates no new backup. Closing a running update dialog does not cancel queued work.

#### Link works to media records

Mark a work as wanted on Douban, then import it into a Markdown collection with your own Douban sync tool. Set the six collection paths to your existing books, movies, series, music, games, and theater lists. Defaults are under `Recommendations/`; this plugin reads existing files only.

In either media log (editing or reading mode), select **添加关联** beside a record. Choose a wanted work from the dropdown, optionally enter an excerpt, and select **保存关联**. The selected record supplies the source. Available works are marked 想读, 想看, 想听, or 想玩 for their respective media types. The **打开媒体关联入口** command opens the podcast log; video rows provide their own association action.

The work row links to the source record; linked works and excerpts appear as indented child items beneath the podcast or video. Inline comments identify managed links. Live Preview hides management comments and block IDs in configured media logs; source mode shows the Markdown. Existing titles, dates, states, covers, and handwritten formatting are preserved. Multiple sources share one work row, and repeated saves reuse the same association.

Associations update the configured local lists offline. The work and source are checked again before saving. Each note is updated separately; if the second write fails, the dialog reports which side was saved. Saving again completes the missing side without duplication. After layout is ready, existing work-side associations restore missing links beneath media records, including works that have since been completed.

Collections use single-line Markdown list entries, for example:

```markdown
- [Work title](<https://movie.douban.com/subject/123/>) <!-- douban-state: 想看 --> <!-- douban-type: movie --> ^douban-123
```

`douban-type` accepts `book`, `movie`, `teleplay`, `music`, `game`, and `theater`; without it, the configured collection type is used. The optional `media-capture:recommend` workspace event accepts `{ path, blockId }` to preselect a source record; `supportsRecommendations` indicates support.

Custom sync tools must preserve the span between `media-sources:start` and `media-sources:end` when rewriting a matching work. Douban collection synchronization is handled by external tools.

#### Settings

| Setting | Default | Behavior |
| --- | --- | --- |
| Write rules | Concentrated log enabled | Presets or independently configured append/create rules |
| Video log | `Videos.md` | Separate destination sharing the concentrated log template and heading |
| Play in Obsidian | Disabled | Video playback links through a configured compatible player |
| Cover folder | `image/media` | Shared local cover directory |
| Download covers | Enabled | Downloads missing covers when capturing or repairing |
| Repair on startup | Disabled | Repairs concentrated-log covers after layout is ready |
| Daily integration | Disabled | Links completed podcast or video records to exactly one existing dated note |
| Maimemo token | Empty | Optional authenticated access to today's study progress |
| Daily folder / property | `Daily` / `media` | Searches subfolders; preserves other properties |
| Collection paths | Files under `Recommendations/`: `Books.md`, `Movies.md`, `Series.md`, `Music.md`, `Games.md`, `Theater.md` | Existing wanted-work collections |

Daily integration writes links to existing notes whose filenames match `YYYY-MM-DD` in the configured folder or its subfolders. When the concentrated log rule runs, its block link is used; otherwise the first additional output supplies the link, including an episode anchor in a show file. A note created from an existing log row keeps the existing activity source. Changing rule paths affects new outputs; existing files stay in place.

#### Optional Maimemo study progress

In Media Capture settings, enter the API token under **墨墨学习（可选） → 墨墨 API 令牌**. The field masks the token and saves it with plugin settings. Obtain a token from the Maimemo app under **我的 → 更多设置 → 实验功能 → 开放 API** and enable automatic synchronization. Open the app each day to initialize the study tasks.

Vault views can call `app.plugins.plugins['media-capture'].fetchStudyProgress()` to retrieve `{finished, total, study_time, new_finished, review_finished}`. The method uses Obsidian's request API and the configured token; `study_time` is milliseconds. Completed words from `get_today_items` supply the new-word and review-word counts. A complete breakdown requires the list count to match the progress count; the endpoint supports up to 1,000 items per request. Requests run only when called. A temporary HTTP 503 is retried once after one second. Authentication, rate-limit and response errors produce a readable message. Diary layout, date checks, saved daily snapshots and learning flags remain the responsibility of vault scripts.

#### Record identity and repair

Artwork filenames use the podcast show name when available, or the record title; videos use their title. Invalid characters become underscores, and different artwork with the same name receives an eight-character suffix. Candidate images come from configured logs and capture records. Byte-identical images share a file. Podcast covers from the same normalized show name also receive a conservative visual comparison at 32 by 32 pixels; matching resized or recompressed artwork reuses the existing file. Videos use byte comparison. New records may download an image for comparison; duplicate files are not saved. Cover URLs and repair reports are not persisted. Repair results appear in the current operation. Existing attachments keep their names and locations.

When cover repair obtains an exact Apple episode match, it can replace a generic Apple player title previously saved as the record title. Handwritten titles, original dates, block IDs, and quotations are preserved.

The plugin appends media-state and media-date comments and an Obsidian block identifier. These markers support deduplication, cover repair, and daily note links. Keep them when editing records manually. Notes and quotations outside the episode row are preserved.

Records from the same platform are matched by episode or video ID. Across platforms, records are reused only when the full `show · title` matches after case, whitespace, and Unicode normalization. A completed record keeps its original date. Recording a repeat listen or viewing on another date requires daily integration and exactly one existing note for that date. Both dates link to the same log row and cover.

#### Data format and vault integration

The plugin manages capture, write rules, local cover files, associations, and optional links to daily notes. Vault scripts or configuration manage diary sections, activity classification, summaries, and completion styling. Paths, templates, daily fields, and workspace events provide the integration points. Existing handwritten formatting is preserved.

The output is ordinary Markdown and can be read directly or used by optional tracking tools. After saving, the plugin emits `media-capture:updated` with `path`, `blockId`, `state`, and `date`. Note captures also include `notePath` and `output`; `blockId` is empty when no log row exists. `CaptureUpdatedEvent` in `src/types.ts` defines the payload. Log-only tracking integrations count records from the configured logs.

Version 0.11 stores only `{schemaVersion: 3, settings}` in data.json. A separate records.json uses schema version 1 and stores output indexes, compact source metadata, and managed append entries. Generated links, image markup, provider identifiers, and duplicate date fields are reconstructed when loading. Unchanged records are not rewritten; record updates are verified in a temporary file before replacement.

Synchronize both files with the notes when moving to another device. Records support output lookup, edit detection, and template updates. Existing combined data must be converted outside the plugin before loading 0.11. Unsupported formats are rejected before writing. Fresh installations create records.json only after capturing content. Template refresh reports missing source metadata per file.

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

Release files are `main.js`, `manifest.json`, and `styles.css`. Generated bundles, dependencies, and personal `data.json` and `records.json` are excluded from source control. Dependency security checks use `npm audit` separately from compilation and functional tests.

Pushing a tag that matches the manifest and package versions runs the release workflow. After build, test, and lint checks pass, it uploads the runtime files and publishes a GitHub prerelease for BRAT. This workflow does not submit the plugin to the community catalog.

#### Local development and deployment

Keep the source repository separate from the installed plugin directory. If the source is inside a vault, ignore that directory in the outer vault Git repository while keeping the installed plugin and its settings in the vault backup. The `release/media-capture/` directory contains generated installation files; the vault installation remains under `.obsidian/plugins/media-capture/`.

Copy `.deploy.example.json` to `.deploy.local.json` and set `vaultPath` to the absolute path of an existing vault. Run `npm run deploy` to build and copy the runtime files, then reload Media Capture in Obsidian. `npm run deploy -- --vault /absolute/path/to/vault` overrides the local configuration; `MEDIA_CAPTURE_VAULT` is also supported. Resolution order is command argument, environment variable, then local configuration.

Deployment copies only main.js, manifest.json, and the optional styles.css. It preserves data.json, records.json, and other installation files, checks the plugin ID and staged version, and rejects deployment into a source repository or through symbolic-link installation directories. Local deployment configuration and release output are excluded from Git. `npm run dev` watches the source and updates the staged files; it does not deploy automatically.

#### Network access and mobile support

Maimemo study progress requests use `POST https://open.maimemo.com/open/api/v1/memo/study/get_study_progress` with the configured Bearer token. YouTube metadata requests use `www.youtube.com/oembed`; Bilibili requests use its public video pages. Douban and Xiaoyuzhou metadata requests go to the selected episode's public page. Apple Podcasts first uses the public iTunes Lookup API at `itunes.apple.com`, matching the exact episode ID and storefront from the shared link, then falls back to the episode webpage. No Apple login or token is used. Catalog results are limited to 200 episodes per show; an older episode may need the webpage fallback or a manually entered title. Cover downloads are restricted to HTTPS hosts under `doubanio.com`, `xyzcdn.net`, `mzstatic.com`, `ytimg.com`, and `hdslb.com`. Saving may fetch a missing cover even when the title was entered manually; disabling cover downloads prevents those image requests. Manual repair and optional startup repair also fetch episode pages when needed. Linking works and episodes reads configured local lists only and makes no network requests.

Runtime code uses Obsidian APIs and standard Web APIs, with no Node.js or Electron dependency. Android and iOS loading is enabled in the manifest; real-device compatibility remains unverified. The plugin does not read platform credentials or playback history and does not include telemetry. Platform or network failures appear in the dialog or cover repair report.

#### License

[Zero-Clause BSD](LICENSE).
