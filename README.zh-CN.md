### Media Capture

[用户手册](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Home-zh-CN) · [示例](sample/README.md)

简体中文 · [English](README.md) · [Français](README.fr.md)

将豆瓣、小宇宙、Apple Podcasts 的播客及 YouTube、Bilibili 视频保存为 Markdown，支持集中清单、独立笔记和按节目／频道归档。默认播客写入 `Podcasts.md`，视频写入 `Videos.md`。

#### 安装

要求 Obsidian 1.8.7 或更高版本。

- **BRAT**：安装并启用 [BRAT](https://github.com/TfTHacker/obsidian42-brat)，添加仓库 `Ch1llNoodle/obsidian-media-capture`，选择已发布版本，再启用 Media Capture。
- **手动安装**：从[发布页](https://github.com/Ch1llNoodle/obsidian-media-capture/releases)下载 `main.js`、`manifest.json`、`styles.css`，放入 `<笔记库>/.obsidian/plugins/media-capture/`，在第三方插件设置中启用。

更新时替换这三个文件并重新加载插件，保留 `data.json` 和 `records.json`。

#### 开始使用

1. 点击侧栏采集图标，或运行“Media Capture: 采集媒体”。
2. 粘贴播客单集或完整视频链接，选择“获取媒体信息”。
3. 确认标题、状态、日期和保存位置，选择“保存并打开”。

媒体采集无需服务凭证。Apple Podcasts 使用单集链接；Bilibili 短链需展开后复制完整地址。信息获取失败时可手填标题，封面缺失不影响保存。

在“功能 → 媒体采集 → 功能设置”中调整[保存方式](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Save-layouts-zh-CN)。设置标题旁的帮助按钮可打开使用指南。

#### 功能与示例

- **媒体记录**：自定义写入规则和 Markdown 模板，保存封面、关联作品及日记。库内播放需要另行配置兼容播放器。
- **任务记录**：将完成的 Markdown 任务和来源链接写入当天日记，沿用核心日记配置。取消勾选保留日志，再次完成更新时间。
- **追踪与同步**：按需开启剧集、阅读、地点、学习、运动、豆瓣收藏及日记来源。[功能模块](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Modules-zh-CN)列出入口和依赖。

将 [Capture Sample](sample/README.md) 整个文件夹复制到笔记库根目录，打开 `Start.md` 选择语言。追踪页需要 Dataview 并启用 JavaScript Queries，日记来源模板使用 Templater，任务记录使用核心日记。运动示例附带人体图，脚本和素材随文件夹一起复制。

在“服务连接”填写已启用功能需要的[凭证](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Service-connections-zh-CN)。豆瓣收藏同步使用 Douban 插件的登录状态。

#### 数据与网络

`data.json` 保存设置和凭证，`records.json` 保存采集元信息及输出索引。跨设备同步时保留这两个文件，公开配置前移除凭证。示例追踪数据保存在 `Capture Sample` 内。

采集和补图访问媒体平台、公开目录及图片服务；启用的搜索、同步和日记来源访问对应服务。DeepSeek 接收模板提供的提示词，豆瓣收藏请求使用登录 Cookie。插件不含遥测。服务说明和排查步骤在[用户手册](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Home-zh-CN)中。

界面跟随 Obsidian 语言，支持中文、英文和法文。插件允许在桌面及移动端启用；手机交互和播放兼容性仍待实机验证。

#### 开发

```sh
npm ci
npm run build
npm test
npm run lint
```

产物位于 `release/media-capture/`。本地部署时，将 `.deploy.example.json` 复制为 `.deploy.local.json`，填写笔记库绝对路径 `vaultPath`，再运行 `npm run deploy`。部署只更新运行文件，保留设置与记录。源码仓库与插件安装目录分开管理。

#### 许可证

[Zero-Clause BSD](LICENSE)。示例人体素材的来源和 MIT 许可位于 [assets](sample/Capture%20Sample/assets/SOURCE.md)。
