### Podcast Capture

简体中文 · [English](README.md)

Podcast Capture 将豆瓣、小宇宙和 Apple Podcasts 的单集分享链接保存为 Obsidian 中的 Markdown 列表。每集占一行，包含名称、可选的本地封面和收听日期，并可按需关联日记。单集提到的作品可关联至集中清单。插件界面目前使用中文。

#### 安装

在 iPhone 或电脑上测试时，从 Obsidian 社区插件安装并启用 [BRAT](https://github.com/TfTHacker/obsidian42-brat)，添加测试插件仓库 `Ch1llNoodle/obsidian-podcast-capture`，选择已发布版本或预发布版本，然后启用 Podcast Capture。BRAT 在 Obsidian 内完成文件安装和后续更新。

插件要求 Obsidian 1.5.0 或更高版本。将 `main.js`、`manifest.json`、`styles.css` 放入 `<笔记库>/.obsidian/plugins/podcast-capture/`，在 **设置 → 第三方插件**中启用 **Podcast Capture**。从源码构建时，三个文件生成于 `release/podcast-capture/`。

更新时替换这三个文件，重新加载插件。保留原有 `data.json`，其中保存个人设置和最近一次封面补全报告。

#### 添加单集

1. 打开命令面板，运行 **Podcast Capture: 添加播客**。
2. 粘贴单集分享链接，选择**获取名称与封面**。
3. 确认名称、收听日期和状态，选择**保存**。

状态包括 `听过`、`在听`、`想听`，只有听过条目保存收听日期。日期由使用者填写，插件不读取播放历史。启用日记联动后，从配置目录中的日期日记打开添加窗口，默认采用该篇日记的日期。

Apple Podcasts 使用单集分享链接；缺少 `i` 单集参数的节目主页不能作为单集记录。网页信息获取失败时，可手动填写名称；封面下载失败不阻止记录保存。

**打开播客记录**打开配置的记录文件。**补全缺失封面**重新获取缺失图片，并报告失败阶段；已取得图片地址时，报告提供原图链接。

#### 关联作品与播客

先在豆瓣标记想读、想看等状态，通过自己的豆瓣同步工具将作品导入 Markdown 清单。在设置中把书籍、电影、电视剧、音乐、游戏和舞台剧路径指向已有清单；默认路径位于 `Recommendations/`，插件只读取已存在的文件。

在播客记录的编辑模式或阅读模式中选择单集旁的**添加关联**。窗口固定使用该单集作为来源，从作品下拉框选择想读、想看、想听或想玩的作品，填写可选摘记，再选择**保存关联**。窗口不提供搜索框或来源播客选择框，进行中、已完成及未标记状态的作品不列入选项。**打开播客关联入口**命令打开播客记录页。

作品行追加来源单集的块链接和摘记，关联作品的链接及摘记在对应播客下方按缩进子列表显示，不加“推荐”标签，内部管理标记使用行内注释，不再单占两行。实时预览只在播客记录中隐藏状态、作品管理注释和单集块标识；源码模式保留原始 Markdown。作品清单的显示由 Obsidian 样式或其他工具独立管理。阅读视图对子列表单独设置换行与缩进，保留名称、日期、状态及封面。同一来源重复保存不会重复追加，多个来源保存在同一作品行。关联过程完全在本地进行，不搜索豆瓣、不请求作品详情、不下载作品封面，也不创建作品文件、待看条目或日记属性。保存前重新检查作品及来源是否仍存在。两篇笔记分别更新；第二次写入失败时明确提示已保存的一侧，再次保存可以补全且不会重复。插件在工作区就绪后从已有作品侧关联补回播客行链接，后来已完成的作品也会继续显示。

作品清单使用单行 Markdown 列表，例如：

```markdown
- [作品名称](<https://movie.douban.com/subject/123/>) <!-- douban-state: 想看 --> <!-- douban-type: movie --> ^douban-123
```

`douban-type` 可使用 `book`、`movie`、`teleplay`、`music`、`game`、`theater`，缺省时采用该清单配置的类型。可选工作区事件 `podcast-capture:recommend` 接收 `{ path, blockId }`，打开窗口并选中该来源播客；`supportsRecommendations` 表示接口可用。

自定义同步脚本需要在同一作品的新行中保留 `podcast-sources:start` / `podcast-sources:end` 之间的来源信息。豆瓣收藏同步由外部工具负责。

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
| 书籍清单 | `Recommendations/Books.md` | 已有作品清单 |
| 电影清单 | `Recommendations/Movies.md` | 已有作品清单 |
| 电视剧清单 | `Recommendations/Series.md` | 已有作品清单 |
| 音乐清单 | `Recommendations/Music.md` | 已有作品清单 |
| 游戏清单 | `Recommendations/Games.md` | 已有作品清单 |
| 舞台剧清单 | `Recommendations/Theater.md` | 已有作品清单 |

日记联动仅在找到唯一一篇对应日期的日记时写入链接，不自动创建日记。修改路径不会迁移原有记录、封面或日记。

#### 模板与记录标识

模板支持 `date`、`cover`、`link`、`title`、`url`、`state`、`provider`。`cover` 生成宽度为 24 的 Markdown 图片，`link` 生成带单集名称的 Markdown 链接，其余变量生成文本。例如，`- {{link}} · {{date}} {{cover}}` 将名称放在日期前面。

补全封面时，若旧记录误存了通用 Apple 网页播放器标题，且取得了精确匹配的单集信息，会同时修正该标题；手写名称、原日期、块标识和摘抄保留。

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

生产构建将运行代码打包为 `release/podcast-capture/main.js`，并在同目录暂存 manifest 和样式。测试使用 esbuild 编译 TypeScript 模块，再通过模拟的 Obsidian API 验证行为。可选的追踪视图兼容测试由 `PODCAST_TRACKER_TEST_PATH` 指定脚本路径；未设置时跳过该项。`PODCAST_DOUBAN_SYNC_TEST_PATH` 可另外指定自定义豆瓣同步视图，验证来源保留与状态合并。

发布文件为 `main.js`、`manifest.json`、`styles.css`。源码仓库忽略生成的构建文件、依赖目录及个人 `data.json`。依赖安全检查使用 `npm audit`，与编译、功能测试分别执行。

推送与 manifest、package 版本一致的标签后，发布工作流执行构建、测试和 ESLint，上传运行文件并发布可供 BRAT 安装的 GitHub 预发布版。该流程不提交 Obsidian 社区商店审核。

#### 本地开发与部署

源码仓库与安装目录分开管理；源码位于笔记库内时，在外层 Git 仓库忽略源码目录，运行文件和个人配置继续随笔记库备份。`release/podcast-capture/` 保存生成的安装文件，笔记库安装位置仍为 `.obsidian/plugins/podcast-capture/`。

将 `.deploy.example.json` 复制为 `.deploy.local.json`，把 `vaultPath` 设置为已有笔记库的绝对路径。执行 `npm run deploy` 完成构建和运行文件复制，然后在 Obsidian 中重新加载插件。`npm run deploy -- --vault /absolute/path/to/vault` 可覆盖本机配置，也支持环境变量 `PODCAST_CAPTURE_VAULT`；取值优先级为命令参数、环境变量、本机配置。

部署只复制 main.js、manifest.json 和可选的 styles.css，保留 data.json 及其他安装文件；写入前核对插件 ID 和构建版本，拒绝部署到源码仓库或通过符号链接安装目录写入。本机部署配置和 release 产物不进入 Git。`npm run dev` 监听源码并更新构建目录，不自动部署。

#### 网络访问与移动端

豆瓣和小宇宙的元信息请求发送至单集公开页面。Apple Podcasts 优先使用 `itunes.apple.com` 的公开 iTunes Lookup API，按分享链接中的单集编号和地区精确匹配，再回退单集网页，不使用 Apple 登录态或令牌。节目目录每次最多查询 200 集，较早单集可能需要网页回退或手动填写名称。封面仅从 `doubanio.com`、`xyzcdn.net`、`mzstatic.com` 及其子域通过 HTTPS 下载。即使手动填写名称，保存时也可能请求缺失封面；关闭本地封面下载后，不再发起图片下载请求。手动补图和可选的启动补图也会按需请求单集页面。作品与播客的关联仅访问已配置的本地清单，不发起网络请求。

运行代码使用 Obsidian API 和标准 Web API，不依赖 Node.js 或 Electron。manifest 允许 Android、iOS 加载，尚未完成真机兼容性验证。插件不读取平台登录凭据或播放历史，不包含遥测。平台或网络错误会显示在添加窗口或补图报告中。

#### 许可证

[Zero-Clause BSD](LICENSE)。
