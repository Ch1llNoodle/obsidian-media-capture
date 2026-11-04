### Podcast Capture

Capture Douban, Xiaoyuzhou, and Apple Podcasts episodes in a configurable Markdown log, with local covers and optional daily note integration.

This prerelease is available for testing with BRAT. Android and iOS loading is enabled; real-device compatibility remains unverified. The interface uses Chinese.

#### Clean editing and reading layouts

The 添加关联 button is available beside podcast entries in both editing and reading mode. Work links and excerpts appear as indented child list items beneath each episode, without a recommendation label. Existing inline episode links are converted to this layout while retaining their block IDs. Existing associations restore missing episode links after layout is ready. The wanted-only dropdown and fixed source remain unchanged. Each note is saved separately, with explicit partial-failure reporting and idempotent retry.

#### Apple Podcasts metadata fix

Apple episode metadata now uses the public iTunes Lookup API before falling back to the webpage. Generic web player titles are rejected. Cover repair can correct previously saved player titles while preserving dates, block links, quotations, and custom names.

#### Install with BRAT

1. Install and enable BRAT from Obsidian's community plugins.
2. In BRAT, add `Ch1llNoodle/obsidian-podcast-capture` as a beta plugin.
3. Select this release or the latest available version, then enable Podcast Capture.

The release contains `main.js`, `manifest.json`, and `styles.css`. Personal settings are not included.

#### 中文说明

将豆瓣、小宇宙和 Apple Podcasts 的单集保存为集中记录，支持本地封面、输出设置和可选的日记联动。本预发布版通过 BRAT 安装；已允许移动端加载，尚未完成真机验证。

在 Obsidian 社区插件中安装并启用 BRAT，添加仓库 `Ch1llNoodle/obsidian-podcast-capture`，选择本版本或最新版本，然后启用 Podcast Capture。iPhone 无须通过“文件”App 复制插件文件。

Apple 单集优先通过公开目录获取名称和封面，不依赖 Apple 登录。旧播放器标题可通过“补全缺失封面”一并修正，日期、块链接、摘抄和手写名称保留。

在播客记录中选择单集旁的“添加关联”，直接选择想读、想看、想听或想玩的作品，填写可选摘记。来源固定为所点单集，没有搜索框和播客选择框，不列出已完成或进行中的作品。

编辑模式和阅读模式均提供单集行内“添加关联”按钮。保存后播客行显示作品链接及摘记，作品行保留来源；已有作品侧关联在工作区就绪后补回播客行链接。

Live Preview hides internal metadata and episode block IDs. Work markers are inline comments; reading-mode linked works use a scoped block layout. The association action uses a lightweight text-button style.

实时预览隐藏内部注释和块标识；作品管理标记改为行内注释，不再占据单独空行。阅读视图对子列表单独设置换行与缩进，按钮改为轻量文字样式。

Reading-mode episode rows allow flex wrapping, and linked-work lists occupy a full row. This also supports collection layouts that use a horizontal flex row for episode covers and titles.

阅读视图中的播客父项允许 flex 换行，关联作品列表独占完整一行，兼容封面与标题横向排列的清单样式。
