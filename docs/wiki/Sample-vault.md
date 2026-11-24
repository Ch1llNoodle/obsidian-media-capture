> **English** · [简体中文](Sample-vault-zh-CN.md) · [Français](Sample-vault-fr.md)

The sample vault provides ready-to-use interactive pages and templates so you can try every module without writing code.

## Setup

1. Open the [source repository](https://github.com/Ch1llNoodle/obsidian-media-capture), select **Code → Download ZIP**, extract the archive, and open the `sample` folder.
2. Copy the entire `Capture Sample` folder to your Obsidian vault root. Keep its folder name, `scripts/demo.js`, and `scripts/strings.json` intact.
3. Open `Capture Sample/Start.md` and choose **English**, **简体中文**, or **Français**. Each language includes instructions, interactive controls, status messages, and Daily templates.
4. Enable the modules listed on the pages you want to try and fill in only their required credentials.

## Plugin dependencies

| Feature | Required plugins & settings |
| --- | --- |
| **Media capture** | Media Capture only |
| **Task completion log** | Media Capture + core **Daily notes** |
| **Interactive trackers** (reading, series, places, study, exercise, Douban) | Media Capture + **Dataview** with **Enable JavaScript Queries** turned on (open in **Reading view**) |
| **Daily source templates** | Media Capture + **Templater** |

## Try an offline example first

- **Reading:** Open the Reading example, enter a book name and date, load progress, enter page numbers, and save. Reload the same book to verify.
- **Exercise:** Enter a video identifier, select muscles on the body map, save, and reload.

> [!TIP]
> Neither **Reading** nor **Exercise** requires any external service key.

### Other sample pages

- **Series:** Search shows, pick a season, and check off episodes.
- **Places:** Search places and write visit links.
- **Study:** Save today’s word counts.
- **Douban:** Demonstrates book collection sync only.
- **Daily sources:** Guides you through inserting the Templater template into an empty dated note.

## Folder layout & data

```text
Capture Sample/
├── Start.md       # Language picker and entry point
├── data/          # Tracker JSON files
├── daily/         # Generated Daily notes
├── places/        # Place notes
├── image/         # Downloaded covers
└── scripts/       # Required demo.js & strings.json
```

- Media capture and task logging continue using your existing plugin and core **Daily notes** settings.
- Sample dates use the `Asia/Shanghai` timezone.

## Language & privacy

- **Cross-language continuity:** Switching sample language updates UI controls, help text, and template copy while keeping stable book, video, and muscle identifiers intact — saved choices load seamlessly across languages.
- **No automatic translation:** Service-returned titles/weather and your own names or record contents are never automatically translated.
- **Explicit actions only:** Opening a sample page reads local files only — it never imports settings, creates data, or contacts external services until you explicitly click save/search/sync or insert a source template.

---

[← Service credentials](Service-connections.md) · [Troubleshooting →](Troubleshooting.md)
