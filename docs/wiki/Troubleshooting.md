### Troubleshooting

[English](Troubleshooting.md) · [简体中文](Troubleshooting-zh-CN.md) · [Français](Troubleshooting-fr.md)

| Symptom | What to check |
| --- | --- |
| No sample buttons | Install and enable Dataview, enable JavaScript Queries, use Reading view and keep the full Capture Sample/scripts directory |
| A module-enable message appears | Enable that module under Capture Features, then reopen the page |
| A credential field is missing | Enable its feature or choose its Daily source first |
| A filled token still fails | Verify the token type and service access; the field does not test connectivity |
| Episode info is unavailable | Confirm an episode/full video URL, try again or enter the title manually |
| Record saved without a cover | The record is valid; retry cover repair under Maintenance later |
| Cannot find a saved note | Check the capture destination preview and Get started page; media and video logs are separate |
| Task log is missing | Configure core Daily notes, enable task logging, check the target heading and complete a new ordinary Markdown task |
| Daily source text did not appear | Select the sources, fill credentials and insert the compatible Templater template in a new blank note |
| Old notes did not change | Templates apply to new notes; use Maintenance preview for existing capture records |
| JSON or sync-conflict error | Inspect the file path in the error, resolve damaged data or file-sync conflicts, reload and retry |

Study sync uses today’s date in the page’s timezone. Do not try to use it to fill a historical day. Douban authentication failures require signing in again through the Douban plugin.

Keep handwritten notes outside managed sync regions. Before template refresh, review the preview and selected files; the operation creates backups. A remote service error can remain in the service’s own language.

When reporting an issue, include your Obsidian and plugin versions, desktop/mobile platform, action and visible error. Remove API keys, cookies and private note contents.

[Media Capture](Home.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
