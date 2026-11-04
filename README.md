### Podcast Capture

[简体中文](README.zh-CN.md) · English

Podcast Capture saves episode links from Douban, Xiaoyuzhou, and Apple Podcasts to a Markdown log in Obsidian. Each episode occupies one line with a title, an optional local cover, and a listening date. Daily note integration is optional. The interface currently uses Chinese.

#### Installation

Obsidian 1.5.0 or later is required. Place `main.js`, `manifest.json`, and `styles.css` in `<Vault>/.obsidian/plugins/podcast-capture/`, then enable **Podcast Capture** under **Settings → Community plugins**. Build these files from source using the development commands below.

When updating, replace those three files and reload the plugin. Keep the existing `data.json`, which stores personal settings and the latest cover repair report.

#### Capture an episode

1. Open the command palette and run **Podcast Capture: 添加播客** (add podcast).
2. Paste an episode share link and select **获取名称与封面** (fetch title and cover).
3. Confirm the title, listening date, and state, then select **保存** (save).

States are `听过` (listened), `在听` (in progress), and `想听` (wishlist). Only listened entries receive a listening date. The date is entered manually; the plugin does not import playback history. With daily integration enabled, opening the dialog from a dated note in the configured daily folder uses that note's date.

For Apple Podcasts, share an individual episode. A show URL without an `i` episode parameter is rejected. If metadata cannot be fetched, enter the title manually. A failed cover download does not prevent saving.

**打开播客记录** opens the configured log. **补全缺失封面** retries missing covers and reports the failure stage; when an image URL is available, the report links to the original image.

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

Daily integration writes a link only when exactly one matching note exists. It does not create daily notes. Changing paths does not relocate records, covers, or daily notes.

#### Templates and record identity

Template variables are `date`, `cover`, `link`, `title`, `url`, `state`, and `provider`. `cover` expands to a Markdown image with a width of 24; `link` expands to the episode's Markdown link. The other variables expand to text. For example, `- {{link}} · {{date}} {{cover}}` places the title before the date.

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

The production build bundles runtime code into `main.js`. Tests bundle TypeScript modules with esbuild and execute them against mocked Obsidian APIs. An optional tracker compatibility test uses the script path provided by `PODCAST_TRACKER_TEST_PATH`; it is skipped when that variable is absent.

Release files are `main.js`, `manifest.json`, and `styles.css`. Generated bundles, dependencies, and personal `data.json` are excluded from source control. Dependency security checks use `npm audit` separately from compilation and functional tests.

#### Network access and mobile support

Metadata requests go to the selected episode's public page on Douban, Xiaoyuzhou, or Apple Podcasts. Cover downloads are restricted to HTTPS hosts under `doubanio.com`, `xyzcdn.net`, and `mzstatic.com`. Saving may fetch a missing cover even when the title was entered manually; disabling cover downloads prevents those image requests. Manual repair and optional startup repair also fetch episode pages when needed.

Runtime code uses Obsidian APIs and standard Web APIs, with no Node.js or Electron dependency. Android and iOS loading is enabled in the manifest; real-device compatibility remains unverified. The plugin does not read platform credentials or playback history and does not include telemetry. Platform or network failures appear in the dialog or cover repair report.

#### License

[Zero-Clause BSD](LICENSE).
