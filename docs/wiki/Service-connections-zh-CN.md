### 服务凭证

[English](Service-connections.md) · [简体中文](Service-connections-zh-CN.md) · [Français](Service-connections-fr.md)

开启模块或选择日记来源后，进入“服务连接”。只显示这些功能实际需要的凭证；地点与天气共用高德凭证。输入默认隐藏，可用眼睛按钮临时查看。已填值只表示保存完成，不代表连接测试通过。

| 用途 | 服务 | 填写内容 |
| --- | --- | --- |
| 剧集资料 | TMDB | API Read Access Token，不能用 v3 API Key 代替 |
| 学习同步 | 墨墨 | 开放接口 Token |
| 地点与天气 | 高德 | Web 服务 Key |
| 定位 | 腾讯地图 | 定位服务 Key |
| 问候语 | DeepSeek | API Key |
| 诗词 | 今日诗词 | User Token |
| 月相 | wttr.in | 无需凭证 |

在自己的服务商账号的开发者／API 设置中申请凭证，只粘贴到插件设置，不放入示例笔记或公开仓库。关闭功能会隐藏输入项，已填值保留。

媒体采集、阅读、肌群选择和任务记录不需要这些 Key。豆瓣批量同步读取 Douban 插件保存的登录状态，不要求再次填写密码。

采集、搜索、同步或插入日记模板时才会发起对应请求。DeepSeek 接收模板提供的提示词；腾讯 IP 定位、高德天气、wttr.in 接收相应位置查询。服务返回的标题、天气及错误保留来源语言。

失败时检查凭证类型、网络与服务账号权限，操作排查见[常见问题](Troubleshooting-zh-CN.md)。

[Media Capture 使用手册](Home-zh-CN.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
