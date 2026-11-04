### Podcast Capture

Capture Douban, Xiaoyuzhou, and Apple Podcasts episodes in a configurable Markdown log, with local covers and optional daily note integration.

This prerelease is available for testing with BRAT. Android and iOS loading is enabled; real-device compatibility remains unverified. The interface uses Chinese.

#### Episode recommendations

Add books, films, series, music, games, and stage productions mentioned in an episode to configurable wishlists. Source block links and optional reasons are kept inline; existing states and custom titles are preserved. Public Douban search can fall back to a browser search and manual URL entry.

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
