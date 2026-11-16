### 示例笔记库

[English](Sample-vault.md) · [简体中文](Sample-vault-zh-CN.md) · [Français](Sample-vault-fr.md)

#### 复制示例

1. 打开[源码仓库](https://github.com/Ch1llNoodle/obsidian-media-capture)，选择“Code → Download ZIP”，解压后进入 sample。
2. 把整个 Capture Sample 文件夹复制到笔记库根目录，保留名称、scripts/demo.js 与 scripts/strings.json。
3. 打开 Capture Sample/Start.md，选择简体中文、English 或 Français。每种语言都有操作说明、交互按钮、状态提示和日记模板。
4. 按页面说明开启模块，只填写需要的凭证。

#### 准备依赖

媒体采集只需 Capture；任务记录还需要 Obsidian 核心日记。阅读、剧集、地点、学习、运动和豆瓣互动页需要 Dataview，并在其设置中开启 Enable JavaScript Queries，使用阅读视图打开页面。日记来源模板使用 Templater。

#### 先试离线页面

打开阅读示例，填书名和日期，载入进度后填页码并保存，再载入同一本书核对。运动示例填视频标识、选择肌群、保存并重新载入。这两个功能不需要服务凭证。

剧集示例提供搜索、选季和勾选；地点示例搜索地点并写入到访链接；学习示例保存今天词数；豆瓣示例仅同步书籍收藏。日记来源页面说明怎样在空白日期笔记中插入 Templater 模板。

#### 数据与语言

追踪 JSON 在 Capture Sample/data，生成日记在 daily，地点在 places，封面在 image。媒体和任务记录沿用已有插件及核心日记设置。日期默认按 Asia/Shanghai 归属。

切换语言改变控件、说明与模板文案；书籍、视频与肌群的稳定标识保持一致，可以跨语言载入相同记录。服务返回标题、天气不自动翻译，自己的名称和记录内容也不翻译。

打开示例只读取本地数据，不导入配置、不创建数据、不请求服务。点击保存、搜索、同步，或插入日记来源模板后，才会执行对应写入或请求。

[Media Capture 使用手册](Home-zh-CN.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
