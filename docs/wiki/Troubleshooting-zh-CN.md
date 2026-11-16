### 常见问题

[English](Troubleshooting.md) · [简体中文](Troubleshooting-zh-CN.md) · [Français](Troubleshooting-fr.md)

| 现象 | 检查方法 |
| --- | --- |
| 示例没有按钮 | 安装并启用 Dataview，开启 JavaScript Queries，使用阅读视图，保留完整 scripts 目录 |
| 提示开启模块 | 在 Capture 功能页开启对应模块，再重新打开页面 |
| 没有对应凭证输入框 | 先开启功能，或选择对应日记来源 |
| 已填 Token 仍失败 | 检查 Token 类型和服务权限；输入框不会自动测试连接 |
| 获取不到媒体信息 | 确认是单集或完整视频链接，可重试或手填标题 |
| 已保存但没有封面 | 记录仍有效，稍后在维护中补图 |
| 找不到记录 | 看采集目标预览和开始使用页，播客与视频清单分别保存 |
| 没有任务日志 | 配置核心日记、开启任务记录、核对标题，并完成一条新的普通 Markdown 任务 |
| 没有日记来源内容 | 选择来源并填写凭证，用配套 Templater 模板生成一篇新空白日记 |
| 旧笔记没有更新 | 模板用于新建，已有采集记录需在维护中预览后更新 |
| JSON 或同步冲突报错 | 按报错路径检查数据或文件同步冲突，修复后重新载入再保存 |

学习同步只处理页面时区的今天，不能用于补写历史词数。豆瓣登录失效时，在 Douban 插件重新登录。

手写内容放在同步管理区之外。应用模板到已有文件前，核对预览与选中文件，操作会先保存备份。服务端错误可能保留其原语言。

反馈问题时提供 Obsidian 与插件版本、电脑／手机平台、具体操作和可见错误，去掉 Key、Cookie 与私有笔记内容。

[Media Capture 使用手册](Home-zh-CN.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
