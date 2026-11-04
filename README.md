### Podcast Capture

[简体中文](README.zh-CN.md) · English

Podcast Capture saves episode links from Douban, Xiaoyuzhou, and Apple Podcasts to a Markdown log in Obsidian. Each episode occupies one line with a title, an optional local cover, and a listening date. Daily note integration is optional. Works mentioned in an episode can be linked to centralized wishlists. The interface currently uses Chinese.

#### Installation

For iPhone and desktop testing, install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's community plugins, then add `Ch1llNoodle/obsidian-podcast-capture` as a beta plugin. Choose a published release or prerelease and enable Podcast Capture. BRAT installs and updates the release files inside Obsidian.

Obsidian 1.5.0 or later is required. Place `main.js`, `manifest.json`, and `styles.css` in `<Vault>/.obsidian/plugins/podcast-capture/`, then enable **Podcast Capture** under **Settings → Community plugins**. Source builds place these files in `release/podcast-capture/`.

When updating, replace those three files and reload the plugin. Keep the existing `data.json`, which stores personal settings and the latest cover repair report.

#### Capture an episode

1. Open the command palette and run **Podcast Capture: 添加播客** (add podcast).
2. Paste an episode share link and select **获取名称与封面** (fetch title and cover).
3. Confirm the title, listening date, and state, then select **保存** (save).

States are `听过` (listened), `在听` (in progress), and `想听` (wishlist). Only listened entries receive a listening date. The date is entered manually; the plugin does not import playback history. With daily integration enabled, opening the dialog from a dated note in the configured daily folder uses that note's date.

For Apple Podcasts, share an individual episode. A show URL without an `i` episode parameter is rejected. If metadata cannot be fetched, enter the title manually. A failed cover download does not prevent saving.

**打开播客记录** opens the configured log. **补全缺失封面** retries missing covers and reports the failure stage; when an image URL is available, the report links to the original image.

#### Recommendations from episodes

Run **添加播客推荐作品** (add a recommendation), or select **＋ 推荐** beside an episode in the reading view of the podcast log. Select the source episode and the work type, search by name or paste a Douban subject URL, then confirm the title and add it to the list. A short recommendation reason is optional. If public search is blocked, **打开豆瓣搜索** opens Douban in the browser; copy the subject URL back and enter the title manually.

Books, films, series, music, games, and theater have separate configurable lists under `Recommendations/` by default. Files are created only when adding a work. New entries go to Wishlist or Watchlist. Adding a work that already exists merges the source links while preserving its state, date, cover, and custom title. The same source is added once. The plugin does not create per-work notes, change your Douban account, or add daily note properties for recommendations.

Source links target the episode block in the podcast log. The optional workspace event `podcast-capture:recommend`, with `{ path, blockId }`, opens the dialog with that episode selected; `supportsRecommendations` on the plugin instance indicates support. This allows a daily view to provide its own button.

Custom collection sync scripts must preserve the `podcast-sources:start` / `podcast-sources:end` span and retain unsynced rows marked `podcast-recommendation`. When the same subject appears in a platform collection, merge the source span into the synchronized row instead of duplicating it.

#### Settings

| Setting | Default | Behavior |
| --- | --- | --- |
| Log file | `Podcasts.md` | Created when absent; changing this setting does not move the existing file |
| Entry heading | `Entries` | New entries are inserted under this heading; other content is preserved |
| Cover folder | `image/podcasts` | Relative path inside the vault |
| Row template | `- {{date}} {{cover}} {{link}}` | One list item per line; must begin with `- ` and contain `{{link}}` |
| Download covers | Enabled | Downloads cover images when saving or repairing entries |
| Repair on startup | Disabled | Checks for missing covers after the workspace is ready |
| Daily integration | Disabled | Writes links for listened episodes to an existing daily note |
| Daily folder | `Daily` | Searches this folder and its subfolders for notes named `YYYY-MM-DD` |
| Daily property | `podcasts` | Stores episode links as a list and preserves other properties |
| Book list | `Recommendations/Books.md` | Recommended books |
| Movie list | `Recommendations/Movies.md` | Recommended films |
| Series list | `Recommendations/Series.md` | Recommended series |
| Music list | `Recommendations/Music.md` | Recommended music |
| Game list | `Recommendations/Games.md` | Recommended games |
| Theater list | `Recommendations/Theater.md` | Recommended stage productions |

Daily integration writes a link only when exactly one matching note exists. It does not create daily notes. Changing paths does not relocate records, covers, or daily notes.

#### Templates and record identity

Template variables are `date`, `cover`, `link`, `title`, `url`, `state`, and `provider`. `cover` expands to a Markdown image with a width of 24; `link` expands to the episode's Markdown link. The other variables expand to text. For example, `- {{link}} · {{date}} {{cover}}` places the title before the date.

Cover repair also replaces a previously saved generic Apple web player title when exact episode metadata is available; custom titles, dates, block identifiers, and quotations are retained.

The plugin appends a state comment, a date comment for listened entries, and an Obsidian block identifier. These markers support deduplication, cover repair, and daily note links. Keep them when editing records manually. Notes and quotations outside the episode row are preserved.

Episodes from the same platform are matched by episode ID. Across platforms, records are reused only when the full `show · episode` title matches after case, whitespace, and Unicode normalization. A completed record keeps its original date. Recording a repeat listen on another date requires daily integration and exactly one existing note for that date; the original log row is retained.

#### Integration and migration

The output is ordinary Markdown. Dataview and other tracking plugins are optional. After saving, the plugin emits the workspace event `podcast-capture:updated` with `path`, `blockId`, `state`, and `date`. `CaptureUpdatedEvent` in `src/types.ts` defines the payload.

Installations predating configurable settings can migrate their existing paths once, when no saved settings exist and the legacy log is present. Saved settings take precedence. Legacy `douban-state` comments and block identifiers remain readable.

#### Development and validation

Runtime source files are TypeScript. The compiler enables `strict`, unchecked indexed access checks, explicit override checks, and unused declaration checks; JavaScript source inclusion is disabled. ESLint rejects explicit `any` and unsafe assignments, arguments, calls, member access, and returns in runtime code. Persisted data and third-party JSON enter as `unknown` and are narrowed before use.

`src/main.ts` manages lifecycle and commands. `service.ts` coordinates capture and cover repair, `storage.ts` handles vault operations, and `core.ts` handles settings, links, and Markdown records. `metadata.ts` and `metadata-helpers.ts` parse public page metadata. The capture dialog and settings tab have separate modules; `types.ts` defines their shared contracts.

```sh
npm ci
npm run typecheck
npm run build
npm test
npm run lint
```

The production build bundles runtime code into `release/podcast-capture/main.js` and stages the manifest and stylesheet alongside it. Tests bundle TypeScript modules with esbuild and execute them against mocked Obsidian APIs. An optional tracker compatibility test uses the script path provided by `PODCAST_TRACKER_TEST_PATH`; it is skipped when that variable is absent. `PODCAST_DOUBAN_SYNC_TEST_PATH` enables an additional integration test against a custom Douban sync view.

Release files are `main.js`, `manifest.json`, and `styles.css`. Generated bundles, dependencies, and personal `data.json` are excluded from source control. Dependency security checks use `npm audit` separately from compilation and functional tests.

Pushing a tag that matches the manifest and package versions runs the release workflow. After build, test, and lint checks pass, it uploads the runtime files and publishes a GitHub prerelease for BRAT. This workflow does not submit the plugin to the community catalog.

#### Local development and deployment

Keep the source repository in an independent workspace. The `release/podcast-capture/` directory contains generated installation files; the vault installation remains under `.obsidian/plugins/podcast-capture/`.

Copy `.deploy.example.json` to `.deploy.local.json` and set `vaultPath` to the absolute path of an existing vault. Run `npm run deploy` to build and copy the runtime files, then reload Podcast Capture in Obsidian. `npm run deploy -- --vault /absolute/path/to/vault` overrides the local configuration; `PODCAST_CAPTURE_VAULT` is also supported. Resolution order is command argument, environment variable, then local configuration.

Deployment copies only main.js, manifest.json, and the optional styles.css. It preserves data.json and other installation files, checks the plugin ID and staged version, and rejects deployment into a source repository or through symbolic-link installation directories. Local deployment configuration and release output are excluded from Git. `npm run dev` watches the source and updates the staged files; it does not deploy automatically.

#### Network access and mobile support

Douban and Xiaoyuzhou metadata requests go to the selected episode's public page. Apple Podcasts first uses the public iTunes Lookup API at `itunes.apple.com`, matching the exact episode ID and storefront from the shared link, then falls back to the episode webpage. No Apple login or token is used. Catalog results are limited to 200 episodes per show; an older episode may need the webpage fallback or a manually entered title. Cover downloads are restricted to HTTPS hosts under `doubanio.com`, `xyzcdn.net`, and `mzstatic.com`. Saving may fetch a missing cover even when the title was entered manually; disabling cover downloads prevents those image requests. Manual repair and optional startup repair also fetch episode pages when needed. Recommendation search sends the entered query to `www.douban.com/search`; subject parsing requests the selected Douban detail page. No platform credentials or source-episode text are sent with those requests. Recommendation covers use the configured cover folder and download switch.

Runtime code uses Obsidian APIs and standard Web APIs, with no Node.js or Electron dependency. Android and iOS loading is enabled in the manifest; real-device compatibility remains unverified. The plugin does not read platform credentials or playback history and does not include telemetry. Platform or network failures appear in the dialog or cover repair report.

#### License

[Zero-Clause BSD](LICENSE).
