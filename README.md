# Podcast Capture

[Podcast Capture](https://github.com/Ch1llNoodle/obsidian-podcast-capture) 将豆瓣、小宇宙和 Apple Podcasts 的单集分享链接保存为简洁的 Markdown 列表，可下载本地封面，并按需写入日记属性。每集只占一行，不要求独立笔记、评分或播放时长。

## 使用

1. 将 `main.js`、`manifest.json`、`styles.css` 放入库内 `.obsidian/plugins/podcast-capture/`，启用 Podcast Capture。
2. 在插件设置中选择记录文件、记录区标题和封面目录。
3. 运行“添加播客”，粘贴单集分享链接，获取名称与封面，确认收听日期和状态后保存。

支持听过、在听、想听。Apple Podcasts 使用“分享单集”，不使用节目主页。页面无法访问时可手动填写名称；封面失败不阻止保存，补全命令提供失败阶段和原图链接。

## 设置

| 设置 | 新安装默认值 | 行为 |
| --- | --- | --- |
| 记录文件 | `Podcasts.md` | 不存在时创建普通 Markdown 文件；修改路径不移动旧文件 |
| 记录区标题 | `Entries` | 新条目插入此标题下，其他正文保留 |
| 封面目录 | `image/podcasts` | 使用库内相对路径 |
| 输出模板 | `- {{date}} {{cover}} {{link}}` | 每条记录一行，以 `- ` 开头，必须包含 `{{link}}` |
| 保存本地封面 | 开启 | 关闭后不发起封面下载请求 |
| 启动时补全封面 | 关闭 | 可通过命令手动补全 |
| 日记联动 | 关闭 | 开启后向指定日期的现有日记写入单集链接 |
| 日记目录 | `Daily` | 读取此目录及子目录中以 `YYYY-MM-DD` 命名的笔记 |
| 日记属性 | `podcasts` | 以列表保存链接，保留其他属性 |

模板变量包括 `date`、`cover`、`link`、`title`、`url`、`state`、`provider`。`cover` 是宽度为 24 的 Markdown 图片，`link` 是带单集名称的 Markdown 链接；其余变量为文本。状态、日期标记和块标识自动附加，供重复添加、补图和日记链接使用，不需要额外查询插件。

例如，`- {{link}} · {{date}} {{cover}}` 可将名称放在日期前面。日期标记用于再次读取收听日，改变可见排版不改变记录日期。

同平台按单集标识去重；跨平台只在“节目名 · 单集名”一致时复用原行。已听过记录保留首次日期；记录另一日重听需要开启日记联动，并先创建该日唯一的日记。

## 与笔记库集成

插件默认输出普通 Markdown，不创建 Dataview 查询、追踪页面或其他插件的配置。日记联动是可关闭的适配功能。完成写入后发出 `podcast-capture:updated` 工作区事件，载荷包含 `path`、`blockId`、`state`、`date`，其他功能可选择监听。

旧版本的固定目录仅保留在一次性迁移设置中：已有旧记录文件且没有新设置时，迁移原来的文件、封面和日记属性；已保存的配置优先，后续不重复猜测路径。旧状态标记、块链接和手写摘抄保留。

## 源码与检查

`src/core.js` 包含平台链接识别、元信息解析、路径与模板校验、Markdown 记录更新；不依赖 Obsidian。`src/main.ts` 负责生命周期与命令注册，`service.js` 负责网络与记录服务，`storage.js` 负责库目录操作，`capture-modal.js`、`settings-ui.js` 分别实现窗口和设置。沿用官方模板的 TypeScript 检查、esbuild 构建及 ESLint 配置。JavaScript 模块通过 allowJs 接入，暂未全面迁移为严格类型的 TypeScript。

```sh
npm ci
npm run build
npm test
npm run lint
```

默认测试可脱离任何个人笔记库执行。额外的现有追踪视图兼容测试由 `PODCAST_TRACKER_TEST_PATH` 指定目标脚本后启用，未指定时跳过。

发布产物为根目录的 main.js、manifest.json、styles.css。Git 忽略生成的 main.js、node_modules 和个人 data.json，发布时单独上传三个运行文件。插件 ID 为 podcast-capture；同一库只启用一个实例。旧安装迁移完成后，确认记录、配置与本地封面可用，再清理旧目录。

源码沿用用户克隆的官方模板及其 Git 历史、0-BSD 许可证；没有推送或创建 Release。2026-11-04 已完成依赖安装、TypeScript 检查与 esbuild 生产构建；24 项源码测试全部通过，其中包含指定追踪脚本后的兼容项。构建产物通过模拟 Obsidian API 的加载、命令注册和卸载检查，尚未替代真实设备验证。

ESLint 当前为 0 错误、1 警告：设置界面沿用旧式 API，未实现新版 Obsidian 的设置搜索声明。普通设置页可用，声明的最低版本仍为 1.5.0。移动端规则继续检查运行代码；只有 Node.js 测试文件使用单独的测试规则。

本次用户终端的 npm ci 报告 26 项漏洞（23 项 moderate、3 项 high），具体公告尚未复核。代理执行环境无法访问在线审计接口，离线审计结果不能作为漏洞已清除的依据；没有执行 npm audit fix，也未升级依赖。发布前需要取得在线 npm audit 明细并逐项处理。

## 移动端与网络范围

运行代码只使用 Obsidian API 和标准 Web API，允许 Android、iOS 加载；尚未完成真机测试。网页及封面通过 `requestUrl` 获取，不读取平台账号或播放历史，收听日期由使用者填写。

当前封面来源限于豆瓣、小宇宙和 Apple 使用的图片域名。客户端或网络拒绝请求时，会保留具体错误，不自动关闭拦截设置。真实封面下载问题与设备兼容性仍需在目标设备验证。
