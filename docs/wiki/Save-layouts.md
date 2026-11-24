> **English** · [简体中文](Save-layouts-zh-CN.md) · [Français](Save-layouts-fr.md)

Open **Settings → Media Capture → Features → Media capture → Feature settings**, choose a preset, and select **Apply preset**.

> [!NOTE]
> Applying a preset replaces your rule configuration only — it never moves or deletes existing notes.

## Built-in presets

| Preset | Default destination | Output |
| --- | --- | --- |
| **Concentrated log** | `Podcasts.md` / `Videos.md` | One entry per item in a shared list |
| **One note per item** | `Media/{{show}}/{{title}}.md` | An individual note for each episode or video |
| **Log and individual note** | Both destinations above | A shared log entry plus an individual note |
| **Append by show or channel** | `Media/{{show}}.md` | Episodes grouped inside one file per show or channel |

The capture form uses your enabled rules by default. Switching to another preset inside the capture form applies **only to that single capture**. Always check the destination preview at the bottom of the form for the exact output path.

## Customizing write rules

Open any rule’s editor to adjust its folder, path pattern, target heading, or template file:

- **Folder:** Leave blank to target the vault root.
- **Template file:** Leave blank to use the rule’s built-in template. File templates are rendered as plain Markdown — scripts inside them are not executed.
- **Missing show name:** Defaults to `Unsorted`.
- **Relative paths:** All paths are relative to your vault root.

## Important constraints

- **Append headings:** When appending to an existing file, that file must already contain the configured heading unless the heading field is left blank (which appends to the end of the file).
- **Path changes:** Updating a rule’s path affects future captures only; existing records stay where they are.
- **No duplicate targets:** Two enabled rules cannot write to the same file during a single capture operation.

## Daily note integration

Daily integration is optional and links completed media items to an existing dated Daily note. It does not build a full tracker or diary layout — for ready-made interactive trackers, see [Sample vault](Sample-vault.md).

---

[← First record](Getting-started.md) · [Feature modules →](Modules.md)
