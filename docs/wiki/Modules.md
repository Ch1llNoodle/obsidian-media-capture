### Feature modules

[English](Modules.md) · [简体中文](Modules-zh-CN.md) · [Français](Modules-fr.md)

Enable only what you use under **Features**. The help guide contains feature instructions covering preparation, actions and results; settings focus on switches and configuration. Disabling a module retains settings and records but blocks its recording operations.

| Module | Entry point | Preparation |
| --- | --- | --- |
| Media capture | Sidebar icon or Capture media command | Share link; no service key |
| Task completion log | Complete a Markdown task | Configure core Daily notes and the log heading |
| Series tracking | Companion series page | TMDB Read Access Token |
| Reading tracking | Companion reading page | Book title and page range; no key |
| Place tracking | Companion places page | Amap Web Service Key |
| Study sync | Companion study button | Maimemo Token |
| Exercise tracking | Companion exercise page | Video identifier and muscle choices; no key |
| Douban sync | Companion collection sync button | Douban plugin installed and signed in |
| Daily note sources | A new note made from a compatible template | Select sources and fill only their required credentials |

#### Companion pages

The plugin supplies recording operations; your vault supplies tracker pages and presentation. A switch or a filled token does not generate a bookshelf, map or Daily template. Copy the [Sample vault](Sample-vault.md) examples to try the modules without writing scripts.

Series checkboxes mark progress cumulatively up to the selected episode; unchecking affects only that episode. Reading records keep each day’s page range. Study sync targets the current day using the page’s timezone. Sample dates use Asia/Shanghai.

#### Daily sources

Location, weather, moon phase, greeting and poetry are independently selectable. All default to Off. The moon source needs no credential. A disabled or failed source returns no content, allowing the template to use its default. Existing Daily notes are not rewritten when a source is enabled.

[Media Capture](Home.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
