> **English** · [简体中文](Troubleshooting-zh-CN.md) · [Français](Troubleshooting-fr.md)

## Common issues

| Symptom | What to check |
| --- | --- |
| **No buttons on sample pages** | Install and enable **Dataview**, turn on **Enable JavaScript Queries**, switch to **Reading view**, and keep the full `Capture Sample/scripts` directory intact. |
| **Module-enable message appears** | Enable that module under **Settings → Media Capture → Features**, then reopen the page. |
| **Credential field is missing** | Enable its parent feature or select its Daily source first. |
| **Filled token still fails** | Verify the exact token type (e.g., TMDB Read Access Token) and account permissions; saving a field does not test connectivity. |
| **Episode info is unavailable** | Confirm you pasted an episode link (Apple Podcasts `i` parameter) or full video URL, retry, or enter the title manually. |
| **Record saved without a cover** | The record is still valid; run cover repair later under **Maintenance**. |
| **Cannot find a saved note** | Check the capture destination preview and the getting started guide; podcast and video logs are saved separately (`Podcasts.md` vs `Videos.md`). |
| **Task log is missing** | Configure core **Daily notes**, enable **Task completion log**, check the target heading, and complete a new ordinary Markdown task. |
| **Daily source text did not appear** | Enable the desired sources, fill in credentials, and insert the compatible **Templater** template into a new blank note. |
| **Old notes did not change** | Templates apply to new notes only; use **Maintenance** preview to refresh existing capture records. |
| **JSON or sync-conflict error** | Inspect the file path shown in the error, fix corrupted JSON or sync conflicts, reload Obsidian, and retry. |

## Good to know

> [!WARNING]
> - **Study sync** only updates **today** in the page’s timezone — do not use it to backfill historical dates.
> - **Douban authentication:** If sync fails due to an expired session, sign in again through the Douban plugin.
> - **Managed sync regions:** Keep handwritten notes outside managed sync blocks.

> [!TIP]
> Before applying template refreshes to existing files, review the preview and selected files carefully. The refresh operation creates backups automatically. Remote service error messages may appear in the provider’s original language.

## Reporting an issue

When opening an issue on [GitHub](https://github.com/Ch1llNoodle/obsidian-media-capture/issues), please include:

- Your **Obsidian version** and **Media Capture version**
- Platform (**desktop** or **mobile**)
- Steps taken and the exact visible error message

> [!CAUTION]
> Always remove API keys, tokens, login cookies, and private note contents before sharing logs or screenshots.

---

[← Sample vault](Sample-vault.md) · [Back to Home](Home.md)
