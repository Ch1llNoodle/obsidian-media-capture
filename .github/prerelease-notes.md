### Podcast Capture 0.6.0

[简体中文说明](https://github.com/Ch1llNoodle/obsidian-podcast-capture/blob/master/README.zh-CN.md) · [English documentation](https://github.com/Ch1llNoodle/obsidian-podcast-capture/blob/master/README.md)

Save Douban, Xiaoyuzhou, and Apple Podcasts episodes as a one-line Markdown log, individual episode notes, or both. Existing installations keep the log default and their saved paths.

#### Episode notes

- Choose the default save mode in settings or override it for a single capture.
- Set a note folder and path pattern to group episodes by show.
- Select a vault Markdown template or edit the built-in template. Variables include show, title, publication date, listening date, description, cover, link, and episode ID.
- Use 创建单集笔记 from the command palette, or 写笔记 beside an episode in editing or reading mode. Existing notes reopen without overwriting handwritten content.
- Managed episode identities locate renamed or moved notes. Filename collisions receive an ID suffix. Template and path errors are checked before output creation. Partial write failures identify the saved side and support retry.

Publication and listening dates remain separate. Missing optional metadata stays empty. Templates run only on creation and do not execute Templater or JavaScript. Daily integration stays optional; both mode retains one log block link, while note-only captures can link the note directly. Work associations continue to use log rows.

#### 安装与使用

通过 BRAT 添加 Ch1llNoodle/obsidian-podcast-capture 并选择本版本，在 Obsidian 中启用插件。已有安装更新后重新加载插件。默认继续每集一行；需要长笔记时，在添加窗口选择“单集笔记”或“清单与单集笔记”，也可点已有单集旁的“写笔记”。目录、文件名与模板可在插件设置中调整。

发布附件为 main.js、manifest.json、styles.css，不包含个人 data.json。运行代码使用 Obsidian 和 Web API，允许 Android、iOS 加载；0.6.0 新功能尚未完成手机真机验证。界面使用中文。

#### Validation

Strict TypeScript, production bundling, ESLint, and automated tests cover capture modes, templates, note identity, duplicate saves, collision handling, retry, row actions, existing daily integration, recommendations, and deployment. Real platform availability and device rendering still require testing in Obsidian.
