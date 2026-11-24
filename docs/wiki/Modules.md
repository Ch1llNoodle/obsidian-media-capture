> **English** · [简体中文](Modules-zh-CN.md) · [Français](Modules-fr.md)

Enable only the modules you need under **Settings → Media Capture → Features**. The in-app help guide explains preparation, actions, and expected results for each feature, while settings stay focused on switches and configuration.

> [!NOTE]
> Disabling a module preserves its settings and existing records while blocking new recording operations.

## Modules overview

| Module | Entry point | Requirements |
| --- | --- | --- |
| **Media capture** | Ribbon icon or **Capture media** command | Share link (no service key) |
| **Task completion log** | Complete an ordinary Markdown task | Core **Daily notes** + configured log heading |
| **Series tracking** | Companion series page | TMDB API Read Access Token |
| **Reading tracking** | Companion reading page | Book title & page range (no service key) |
| **Place tracking** | Companion places page | Amap Web Service Key |
| **Study sync** | Companion study sync button | Maimemo Open API Token |
| **Exercise tracking** | Companion exercise page | Video ID & muscle choices (no service key) |
| **Douban sync** | Companion collection sync button | Douban plugin installed & signed in |
| **Daily note sources** | New note created from a compatible template | Enabled sources + their required credentials |

## Companion pages

Media Capture provides the recording operations; your vault provides the interactive pages and visual layout.

> [!IMPORTANT]
> Turning on a module or entering a token does **not** automatically generate a bookshelf, map, or Daily template. Copy the ready-made examples from the [Sample vault](Sample-vault.md) to try any module without writing scripts.

### Module-specific behavior

- **Series tracking:** Checking an episode marks progress cumulatively up to that episode; unchecking affects only that single episode.
- **Reading tracking:** Stores each day’s page range independently.
- **Study sync:** Always targets the current day according to the page’s timezone (`Asia/Shanghai` in the sample vault).

## Daily note sources

Location, weather, moon phase, greeting, and poetry can be enabled independently and all default to **Off**:

- **No key needed for moon phase:** Uses `wttr.in` without credentials.
- **Graceful fallback:** A disabled or failed source returns empty content so your template can fall back to its default value.
- **Non-destructive:** Enabling a source never rewrites existing Daily notes.

---

[← Saving layouts](Save-layouts.md) · [Service credentials →](Service-connections.md)
