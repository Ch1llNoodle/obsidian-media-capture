> **English** · [简体中文](Getting-started-zh-CN.md) · [Français](Getting-started-fr.md)

Requires **Obsidian 1.8.7** or later.

## Installation

### Option 1: BRAT (recommended)

1. Install and enable **BRAT** from Obsidian’s **Community plugins** browser.
2. Add the repository `Ch1llNoodle/obsidian-media-capture` and select an available release.
3. Enable **Media Capture** in **Settings → Community plugins**.

### Option 2: Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [Releases page](https://github.com/Ch1llNoodle/obsidian-media-capture/releases).
2. Place all three files into `<Vault>/.obsidian/plugins/media-capture/`.
3. Reload Obsidian and enable **Media Capture** in **Settings → Community plugins**.

> [!IMPORTANT]
> When updating manually, replace only `main.js`, `manifest.json`, and `styles.css`. Keep `data.json` and `records.json` to preserve your settings and capture records.

## Save your first item

1. Copy a podcast episode share link from **Xiaoyuzhou**, **Apple Podcasts**, or **Douban Podcasts**, or a full **YouTube** / **Bilibili** video link.
2. Click the capture icon in Obsidian’s left ribbon, or open the Command Palette and run **Media Capture: Capture media**.
3. Paste the link and select **Fetch media information**. Confirm the title, status, and date (if fetching fails, enter the title manually).
4. Review the destination preview below the form. For your first run, keep the default log layout and select **Save and open**.
5. The target log or note opens automatically. A missing cover does not block saving, and you can check Obsidian’s file explorer to confirm where the file lives.

> [!NOTE]
> - **Apple Podcasts:** Links must point to a specific episode (containing the `i` query parameter).
> - **Bilibili:** Open short links in a browser first and copy the expanded full URL.

## Next steps

- **Customize output:** See [Saving layouts](Save-layouts.md) to switch from a shared log to individual notes or per-show files.
- **Log completed tasks:** Configure Obsidian’s core **Daily notes** plugin first, enable **Task completion log**, then complete an ordinary Markdown task and open today’s Daily note.
- **In-app help:** Settings open on **Features** by default. The help icon beside the title and the **Open getting started guide** command are always available.

> [!NOTE]
> Mobile capture and external playback still require testing on your actual device.

---

[← Home](Home.md) · [Saving layouts →](Save-layouts.md)
