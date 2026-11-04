### Podcast Capture

简体中文 · [English](README.md)

Podcast Capture 将豆瓣、小宇宙和 Apple Podcasts 的单集分享链接保存为 Obsidian 中的 Markdown 列表。每集占一行，包含名称、可选的本地封面和收听日期，并可按需关联日记。插件界面目前使用中文。

#### 安装

在 iPhone 或电脑上测试时，从 Obsidian 社区插件安装并启用 [BRAT](https://github.com/TfTHacker/obsidian42-brat)，添加测试插件仓库 `Ch1llNoodle/obsidian-podcast-capture`，选择已发布版本或预发布版本，然后启用 Podcast Capture。BRAT 在 Obsidian 内完成文件安装和后续更新。

插件要求 Obsidian 1.5.0 或更高版本。将 `main.js`、`manifest.json`、`styles.css` 放入 `<笔记库>/.obsidian/plugins/podcast-capture/`，在 **设置 → 第三方插件**中启用 **Podcast Capture**。从源码生成这三个文件时，使用下文的开发命令。

更新时替换这三个文件，重新加载插件。保留原有 `data.json`，其中保存个人设置和最近一次封面补全报告。

#### 添加单集

1. 打开命令面板，运行 **Podcast Capture: 添加播客**。
2. 粘贴单集分享链接，选择**获取名称与封面**。
3. 确认名称、收听日期和状态，选择**保存**。

状态包括 `听过`、`在听`、`想听`，只有听过条目保存收听日期。日期由使用者填写，插件不读取播放历史。启用日记联动后，从配置目录中的日期日记打开添加窗口，默认采用该篇日记的日期。

Apple Podcasts 使用单集分享链接；缺少 `i` 单集参数的节目主页不能作为单集记录。网页信息获取失败时，可手动填写名称；封面下载失败不阻止记录保存。

**打开播客记录**打开配置的记录文件。**补全缺失封面**重新获取缺失图片，并报告失败阶段；已取得图片地址时，报告提供原图链接。

#### 设置

| 设置 | 默认值 | 行为 |
| --- | --- | --- |
| 记录文件 | `Podcasts.md` | 不存在时创建；修改路径不移动旧文件 |
| 记录区标题 | `Entries` | 新条目插入此标题下，其他正文保留 |
| 封面目录 | `image/podcasts` | 使用库内相对路径 |
| 单行输出模板 | `- {{date}} {{cover}} {{link}}` | 每条记录一行，以 `- ` 开头，必须包含 `{{link}}` |
| 保存本地封面 | 开启 | 保存记录或补图时下载封面 |
| 启动时补全封面 | 关闭 | 工作区就绪后检查缺失封面 |
| 日记联动 | 关闭 | 向现有日记写入已听过单集的链接 |
| 日记目录 | `Daily` | 读取该目录及子目录中以 `YYYY-MM-DD` 命名的笔记 |
| 日记属性 | `podcasts` | 以列表保存单集链接，保留其他属性 |

日记联动仅在找到唯一一篇对应日期的日记时写入链接，不自动创建日记。修改路径不会迁移原有记录、封面或日记。

#### 模板与记录标识

模板支持 `date`、`cover`、`link`、`title`、`url`、`state`、`provider`。`cover` 生成宽度为 24 的 Markdown 图片，`link` 生成带单集名称的 Markdown 链接，其余变量生成文本。例如，`- {{link}} · {{date}} {{cover}}` 将名称放在日期前面。

插件自动附加状态注释、已听过条目的日期注释和 Obsidian 块标识，用于去重、补全封面及日记链接。手动编辑时保留这些标记。单集行之外的笔记和摘抄保留原样。

同平台按单集编号去重；跨平台只有完整的“节目名 · 单集名”经过大小写、空白和 Unicode 规范化后相同时，才复用原记录。已听过记录保留首次日期。记录另一日重听时，需要启用日记联动，并确保该日期已有唯一一篇日记；原记录行继续保留。

#### 笔记库集成与迁移

默认输出为普通 Markdown，Dataview 等追踪插件为可选组件。记录保存后发出 `podcast-capture:updated` 工作区事件，包含 `path`、`blockId`、`state`、`date`，载荷类型由 `src/types.ts` 中的 `CaptureUpdatedEvent` 定义。

尚未支持可配置设置的旧安装，在没有已保存设置、且旧记录文件存在时执行一次路径迁移。已有设置优先。旧 `douban-state` 注释和块标识继续兼容。

#### 开发与检查

运行源码全部使用 TypeScript。编译器启用 `strict`、索引访问检查、显式覆盖检查和未使用声明检查，关闭 JavaScript 源码接入。ESLint 在运行代码中禁止显式 `any`，并检查不安全的赋值、传参、调用、成员访问和返回。持久化数据与第三方 JSON 以 `unknown` 进入，在使用前完成类型收窄。

`src/main.ts` 管理生命周期和命令；`service.ts` 协调记录与补图；`storage.ts` 处理笔记库操作；`core.ts` 处理设置、链接与 Markdown 记录。`metadata.ts` 和 `metadata-helpers.ts` 解析公开网页的元信息，添加窗口与设置页分别使用独立模块，`types.ts` 定义共享数据类型。

```sh
npm ci
npm run typecheck
npm run build
npm test
npm run lint
```

生产构建将运行代码打包为 `main.js`。测试使用 esbuild 编译 TypeScript 模块，再通过模拟的 Obsidian API 验证行为。可选的追踪视图兼容测试由 `PODCAST_TRACKER_TEST_PATH` 指定脚本路径；未设置时跳过该项。

发布文件为 `main.js`、`manifest.json`、`styles.css`。源码仓库忽略生成的构建文件、依赖目录及个人 `data.json`。依赖安全检查使用 `npm audit`，与编译、功能测试分别执行。

推送与 manifest、package 版本一致的标签后，发布工作流执行构建、测试和 ESLint，上传运行文件并发布可供 BRAT 安装的 GitHub 预发布版。该流程不提交 Obsidian 社区商店审核。

#### 网络访问与移动端

元信息请求发送至所选单集在豆瓣、小宇宙或 Apple Podcasts 的公开页面。封面仅从 `doubanio.com`、`xyzcdn.net`、`mzstatic.com` 及其子域通过 HTTPS 下载。即使手动填写名称，保存时也可能请求缺失封面；关闭本地封面下载后，不再发起图片下载请求。手动补图和可选的启动补图也会按需请求单集页面。

运行代码使用 Obsidian API 和标准 Web API，不依赖 Node.js 或 Electron。manifest 允许 Android、iOS 加载，尚未完成真机兼容性验证。插件不读取平台登录凭据或播放历史，不包含遥测。平台或网络错误会显示在添加窗口或补图报告中。

#### 许可证

[Zero-Clause BSD](LICENSE)。
