### Media Capture

[User guide](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki) · [Examples](sample/README.md)

[简体中文](README.zh-CN.md) · English · [Français](README.fr.md)

Save podcasts from Douban, Xiaoyuzhou and Apple Podcasts, and videos from YouTube and Bilibili, as Markdown. Choose a shared list, individual notes or a file per show/channel. Podcasts default to `Podcasts.md` and videos to `Videos.md`.

#### Installation

Requires Obsidian 1.8.7 or later.

- **BRAT:** Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat), add `Ch1llNoodle/obsidian-media-capture`, select a published version, then enable Media Capture.
- **Manual:** Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/Ch1llNoodle/obsidian-media-capture/releases), place them in `<Vault>/.obsidian/plugins/media-capture/`, then enable the plugin in Community plugins.

To update, replace those three files and reload the plugin. Keep `data.json` and `records.json`.

#### First use

1. Select the ribbon capture icon or run **Media Capture: Capture media**.
2. Paste a podcast episode or full video link and fetch its information.
3. Check the title, status, date and destination, then select **Save and open**.

Media capture needs no service credentials. Use an episode link for Apple Podcasts and expand Bilibili short links first. Enter a title manually if fetching fails; a missing cover does not prevent saving.

Configure [save layouts](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Save-layouts) under **Features → Media capture → Feature settings**. The help icon beside the settings title opens the guide.

#### Features and examples

- **Media records:** Customize write rules and Markdown templates; save covers, work associations and Daily note links. In-vault playback requires a compatible player configured separately.
- **Task logging:** Write completed Markdown tasks and source links to today’s note using core Daily notes settings. Unchecking keeps the log; completing again updates its time.
- **Tracking and sync:** Enable series, reading, places, study, exercise, Douban collections and Daily sources as needed. [Modules](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Modules) lists their entry points and dependencies.

Copy the whole [Capture Sample](sample/README.md) folder to your vault root and open `Start.md` to choose a language. Interactive trackers require Dataview with JavaScript Queries enabled; Daily source templates use Templater, and task logging uses core Daily notes. Exercise includes body maps; keep all scripts and assets with the folder.

Enter the [credentials](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Service-connections) for enabled features under **Services**. Douban collection sync uses the Douban plugin’s login session.

#### Data and network

`data.json` stores settings and credentials; `records.json` stores captured metadata and output indexes. Keep both when syncing devices and remove credentials before sharing configuration. Sample tracking data stays under `Capture Sample`.

Capture and cover repair access media platforms, public directories and image services. Enabled search, sync and Daily sources contact their providers. DeepSeek receives the template’s prompt; Douban collection requests use a login cookie. The plugin contains no telemetry. Provider details and troubleshooting are in the [user guide](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki).

The interface follows Obsidian’s language and supports Chinese, English and French. The plugin can be enabled on desktop and mobile; mobile interaction and playback compatibility still need device testing.

#### Development

```sh
npm ci
npm run build
npm test
npm run lint
```

Build output is in `release/media-capture/`. For local deployment, copy `.deploy.example.json` to `.deploy.local.json`, set `vaultPath` to the vault’s absolute path, then run `npm run deploy`. Deployment updates runtime files and preserves settings and records. Keep the source repository separate from the installed plugin directory.

#### License

[Zero-Clause BSD](LICENSE). The sample body maps’ source and MIT license are in [assets](sample/Capture%20Sample/assets/SOURCE.md).
