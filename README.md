# Media Capture

> **English** · [简体中文](README.zh-CN.md) · [Français](README.fr.md)  
> [User Guide (Wiki)](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki) · [Sample Vault](sample/README.md) · [Releases](https://github.com/Ch1llNoodle/obsidian-media-capture/releases)

Save podcasts from **Douban**, **Xiaoyuzhou**, and **Apple Podcasts**, and videos from **YouTube** and **Bilibili**, directly as Markdown in Obsidian. Choose between a shared log, individual notes, or a file per show/channel. Podcasts default to `Podcasts.md` and videos to `Videos.md`.

## Installation

Requires **Obsidian 1.8.7** or later.

- **BRAT (recommended):** Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat), add `Ch1llNoodle/obsidian-media-capture`, select a published release, then enable **Media Capture**.
- **Manual:** Download `main.js`, `manifest.json`, and `styles.css` from [Releases](https://github.com/Ch1llNoodle/obsidian-media-capture/releases), place them in `<Vault>/.obsidian/plugins/media-capture/`, then enable the plugin in **Settings → Community plugins**.

> [!IMPORTANT]
> When updating manually, replace only those three files and reload the plugin. Keep `data.json` and `records.json`.

## First use

1. Select the ribbon capture icon or run **Media Capture: Capture media**.
2. Paste a podcast episode or full video link and fetch its metadata.
3. Review the title, status, date, and destination preview, then select **Save and open**.

> [!TIP]
> Core media capture needs **no service credentials**. Use an episode link for Apple Podcasts (with the `i` parameter) and expand Bilibili short links first. Enter a title manually if fetching fails; a missing cover does not prevent saving.

Configure [saving layouts](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Save-layouts) under **Features → Media capture → Feature settings**. Select the help icon beside the settings title anytime to open the in-app guide.

## Features & sample vault

| Area | Overview |
| --- | --- |
| **Media records** | Custom write rules and Markdown templates, local covers, work associations, and optional Daily note links. In-vault playback requires a compatible player configured separately. |
| **Task logging** | Writes completed Markdown tasks and source links to today’s note using core **Daily notes** settings. Unchecking keeps the log; completing again updates its timestamp. |
| **Tracking & sync** | Optional modules for series, reading, places, study, exercise, Douban collections, and Daily sources. See [Feature modules](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Modules) for entry points and dependencies. |

To try interactive trackers without writing code, copy the whole [Capture Sample](sample/README.md) folder to your vault root and open `Start.md` to choose a language:

- Interactive trackers require **Dataview** with **Enable JavaScript Queries** enabled.
- Daily source templates require **Templater**; task logging uses core **Daily notes**.
- Exercise includes body maps — keep all scripts and assets with the folder.

Enter [service credentials](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Service-connections) for enabled features under **Services**. Douban collection sync reuses the Douban plugin’s login session.

## Data & network

- **Local files:** `data.json` stores settings and credentials; `records.json` stores captured metadata and output indexes. Keep both when syncing devices, and remove credentials before sharing configuration. Sample tracking data stays inside `Capture Sample`.
- **Network requests:** Capture and cover repair contact media platforms, public directories, and image services. Enabled search, sync, and Daily sources contact their respective providers. DeepSeek receives the template’s prompt; Douban collection requests use a login cookie. **The plugin contains no telemetry.** See the [User Guide](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki) for provider details and troubleshooting.
- **Languages & platforms:** The UI follows Obsidian’s language (Chinese, English, and French). The plugin can be enabled on desktop and mobile; mobile interaction and playback compatibility still need device testing.

## Development

```sh
npm ci
npm run build
npm test
npm run lint
```

Build output is written to `release/media-capture/`. For local deployment, copy `.deploy.example.json` to `.deploy.local.json`, set `vaultPath` to your vault’s absolute path, and run `npm run deploy`. Deployment updates runtime files while preserving settings and records. Keep the source repository separate from the installed plugin directory.

## License

[Zero-Clause BSD](LICENSE). The sample body maps’ source and MIT license are documented in [assets](sample/Capture%20Sample/assets/SOURCE.md).
