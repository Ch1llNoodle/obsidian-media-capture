### 保存方式

[English](Save-layouts.md) · [简体中文](Save-layouts-zh-CN.md) · [Français](Save-layouts-fr.md)

打开“功能 → 媒体采集 → 功能设置”，选择预设后点击“应用预设”。应用预设会替换规则配置，已有文件保留原位置。

| 保存方式 | 默认位置 | 结果 |
| --- | --- | --- |
| 集中清单 | Podcasts.md / Videos.md | 每条一行 |
| 每条一篇 | Media/{{show}}/{{title}}.md | 独立的单集笔记 |
| 清单与独立笔记 | 上面两种位置 | 同时生成清单行与笔记 |
| 按节目／频道追加 | Media/{{show}}.md | 同节目放在同一文件中 |

采集窗口默认使用已启用规则；在窗口中改选预设，只影响本次采集。实际目标以窗口下方的预览为准。

在“编辑规则”中修改目录、路径、标题或模板。目录留空表示笔记库根目录，模板文件留空使用内置模板。Markdown 模板按文本生成，其中脚本不执行。缺少节目名时使用 Unsorted。

路径为库内相对路径。追加到已有文件时，该文件需要包含配置的目标标题；标题留空则追加到末尾。改路径影响新输出，已有记录不自动搬迁。同一次采集不能让两条启用规则写入同一文件。

日记联动是可选功能，将完成记录链接到已有的日期日记；不会建立完整追踪界面。需要追踪页面时使用[示例笔记库](Sample-vault-zh-CN.md)。

[Media Capture 使用手册](Home-zh-CN.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
