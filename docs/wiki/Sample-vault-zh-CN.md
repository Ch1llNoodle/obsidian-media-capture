> [English](Sample-vault.md) · **简体中文** · [Français](Sample-vault-fr.md)

示例笔记库提供开箱即用的交互页面与模板，无需编写代码即可体验全部模块。

## 快速部署

1. 打开 [源码仓库](https://github.com/Ch1llNoodle/obsidian-media-capture)，选择 **Code → Download ZIP**，解压后进入 `sample` 目录。
2. 将整个 `Capture Sample` 文件夹复制到 Obsidian 笔记库根目录，保持文件夹名称以及 `scripts/demo.js`、`scripts/strings.json` 完整。
3. 打开 `Capture Sample/Start.md`，选择 **简体中文**、**English** 或 **Français**。每种语言都包含操作说明、交互控件、状态提示与日记模板。
4. 按页面提示开启需要试用的模块，并只填写对应的服务凭证。

## 插件依赖

| 功能 | 所需插件与设置 |
| --- | --- |
| **媒体采集** | 仅需 Media Capture |
| **任务完成记录** | Media Capture + 核心**日记**插件 |
| **交互式追踪页**（阅读、剧集、地点、学习、运动、豆瓣） | Media Capture + **Dataview**（开启 **Enable JavaScript Queries**，并在**阅读视图**下打开） |
| **日记来源模板** | Media Capture + **Templater** |

## 先试离线示例

- **阅读示例：** 填写书名与日期，载入进度后输入页码并保存，再重新载入同一本书验证记录。
- **运动示例：** 填写视频标识，在人体图上点选肌群，保存后重新载入验证。

> [!TIP]
> **阅读**与**运动**示例完全离线可用，无需配置任何外部服务凭证。

### 其他示例页面

- **剧集：** 搜索剧集、选择季度并勾选观看进度。
- **地点：** 搜索地点并写入到访链接。
- **学习：** 同步并保存今日词数。
- **豆瓣：** 演示书籍收藏同步。
- **日记来源：** 演示如何在空白日期笔记中插入 Templater 模板。

## 目录结构与数据

```text
Capture Sample/
├── Start.md       # 语言选择与总入口
├── data/          # 追踪模块 JSON 数据
├── daily/         # 生成的示例日记
├── places/        # 地点笔记
├── image/         # 封面图片
└── scripts/       # 必需的 demo.js 与 strings.json
```

- 媒体采集与任务完成记录沿用现有插件与核心**日记**设置。
- 示例日期默认按 `Asia/Shanghai` 时区归属。

## 语言与隐私说明

- **跨语言数据互通：** 切换示例语言会更新控件、说明与模板文案，但书籍、视频与肌群的稳定标识保持不变，可跨语言载入同一份记录。
- **不做自动翻译：** 服务商返回的标题与天气、以及你自己填写的名称和记录内容均不会被自动翻译。
- **仅在主动操作时生效：** 打开示例页只会读取本地数据，不会导入配置、创建文件或请求外部服务；只有点击保存、搜索、同步或插入模板时才会触发对应写入或网络请求。

---

[← 服务凭证](Service-connections-zh-CN.md) · [常见问题 →](Troubleshooting-zh-CN.md)
