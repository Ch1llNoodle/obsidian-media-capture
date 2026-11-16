### 功能模块

[English](Modules.md) · [简体中文](Modules-zh-CN.md) · [Français](Modules-fr.md)

在“功能”中只开启需要的模块。每张卡片的“怎么使用”包含准备、操作与结果。关闭模块会保留配置和记录，并停止对应记录操作。

| 模块 | 操作入口 | 准备事项 |
| --- | --- | --- |
| 媒体采集 | 侧栏图标或采集命令 | 分享链接，无需服务凭证 |
| 任务完成记录 | 勾选普通 Markdown 任务 | 核心日记设置与任务记录标题 |
| 剧集记录 | 配套剧集页面 | TMDB Read Access Token |
| 阅读记录 | 配套阅读页面 | 书名与页码，无需凭证 |
| 地点记录 | 配套地点页面 | 高德 Web 服务 Key |
| 学习同步 | 配套同步按钮 | 墨墨 Token |
| 运动记录 | 配套运动页面 | 视频标识与肌群选项，无需凭证 |
| 豆瓣同步 | 配套收藏同步按钮 | Douban 插件已安装并登录 |
| 日记信息 | 使用配套模板新建日记 | 选择来源并填写所需凭证 |

#### 配套页面

Capture 提供记录能力，笔记库提供交互页面与展示。开启模块或填入 Token 不会自动生成书架、地图或日记模板。[示例笔记库](Sample-vault-zh-CN.md)提供可直接复制的最小页面，无需自己写脚本。

勾选剧集会补齐截至该集的未看集数，取消只影响单集。阅读保存各天独立页码。学习同步按页面时区只处理今天；sample 默认使用 Asia/Shanghai。

#### 日记来源

定位、天气、月相、问候语与诗词分别选择，默认均为“不使用”。月相无需凭证。关闭或失败的来源不返回内容，由模板使用默认值。开启来源不会重写已有日记。

[Media Capture 使用手册](Home-zh-CN.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
