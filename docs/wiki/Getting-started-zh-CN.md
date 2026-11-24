> [English](Getting-started.md) · **简体中文** · [Français](Getting-started-fr.md)

要求 **Obsidian 1.8.7** 或更高版本。

## 安装方式

### 方式一：通过 BRAT 安装（推荐）

1. 在 Obsidian 第三方插件市场中安装并启用 **BRAT**。
2. 添加仓库 `Ch1llNoodle/obsidian-media-capture` 并选择一个已发布版本。
3. 在 **设置 → 第三方插件** 中启用 **Media Capture**。

### 方式二：手动安装

1. 从 [发布页](https://github.com/Ch1llNoodle/obsidian-media-capture/releases) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 将这三个文件放入 `<笔记库>/.obsidian/plugins/media-capture/`。
3. 重新加载 Obsidian，并在 **设置 → 第三方插件** 中启用 **Media Capture**。

> [!IMPORTANT]
> 手动升级时只需替换 `main.js`、`manifest.json` 和 `styles.css`，请保留 `data.json` 和 `records.json` 以免丢失设置与采集记录。

## 保存第一条记录

1. 在**小宇宙**、**Apple Podcasts** 或**豆瓣播客**复制单集分享链接，或复制完整的 **YouTube** / **Bilibili** 视频链接。
2. 点击 Obsidian 左侧栏的采集图标，或打开命令面板搜索 **Media Capture: 采集媒体**。
3. 粘贴链接并选择 **获取媒体信息**，确认标题、状态与日期（若信息获取失败，可手动填写标题）。
4. 查看窗口下方的目标位置预览。首次使用可保持默认集中清单，点击 **保存并打开**。
5. 保存后会自动打开对应的清单或笔记，也可在文件列表中确认其位置。没有封面不影响保存。

> [!NOTE]
> - **Apple Podcasts：** 必须是带 `i` 参数的单集链接。
> - **Bilibili：** 短链请先在浏览器中打开，再复制展开后的完整地址。

## 下一步

- **自定义保存方式：** 参阅 [保存方式](Save-layouts-zh-CN.md)，切换为每条独立笔记或按节目追加。
- **记录任务完成时间：** 先配置 Obsidian 核心**日记**插件，再开启**任务完成记录**；勾选一条普通 Markdown 任务后，打开当天日记即可查看日志。
- **内置帮助：** 插件设置默认打开**功能**页，标题旁的帮助图标以及命令面板中的 **打开使用指南** 随时可用。

> [!NOTE]
> 移动端采集与外部播放兼容性仍需按实际设备验证。

---

[← 使用手册首页](Home-zh-CN.md) · [保存方式 →](Save-layouts-zh-CN.md)
