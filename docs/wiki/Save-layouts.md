### Saving layouts

[English](Save-layouts.md) · [简体中文](Save-layouts-zh-CN.md) · [Français](Save-layouts-fr.md)

Open **Features → Media capture → Feature settings**. Choose a preset and press **Apply preset**. Applying a preset replaces rule configuration; it does not move or delete existing notes.

| Layout | Default destination | Result |
| --- | --- | --- |
| Concentrated log | Podcasts.md / Videos.md | One row per item |
| One note per item | Media/{{show}}/{{title}}.md | An individual episode note |
| Log and individual note | Both destinations above | A log entry plus a note |
| Append by show or channel | Media/{{show}}.md | Episodes grouped in a show file |

The capture form normally uses your enabled rules. Choosing another preset in that form changes only that capture. The destination preview is the authoritative location for the item being saved.

Open a rule’s editor to change its folder, path, heading or template. A blank folder means the vault root. A blank template file uses the rule’s built-in template. File templates are plain Markdown; scripts inside them are not executed. Missing show names use Unsorted.

Paths are relative to your vault. Existing files targeted by append rules must contain the configured heading, unless the heading is blank. Changing a rule path affects new outputs; existing records stay in place. Two enabled rules cannot write to the same file in one operation.

Daily integration is optional and links completed items to an existing dated Daily note. It does not create a full tracker or diary layout. For sample trackers, use [Sample vault](Sample-vault.md).

[Media Capture](Home.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
