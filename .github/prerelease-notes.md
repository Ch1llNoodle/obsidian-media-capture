### Media Capture 0.8.2

Capture podcast episodes and videos using Markdown templates and configurable write rules. Existing settings and records remain compatible; the released plugin ID remains `podcast-capture`.

#### Changes

- Use readable cover filenames: podcast show names when available, video titles otherwise. Invalid filename characters are sanitized; different artwork with the same name receives a short suffix.
- Reuse identical artwork across platforms and legacy filenames by comparing image bytes. URL caches persist across reloads. Recompressed or resized variants remain separate.
- Keep video rows in a separately configurable video log. In-vault playback is optional and disabled by default; its controls use generic names.
- Strike through associated works when the local collection marks them completed, and refresh after collection updates.

#### 更新说明

封面使用可读名称，优先采用播客节目名或视频标题，同名不同图增加短后缀。跨平台图片内容完全相同时复用已有文件，缓存重载后继续生效；重新压缩、缩放的图片仍分别保存。

视频使用独立清单；“在 Obsidian 中播放”为默认关闭的可选配置。关联作品完成并同步到本地清单后显示删除线。已有记录、模板、配置与插件 ID 保留兼容；更新只替换 main.js、manifest.json、styles.css，不覆盖 data.json。

手机使用预发布安装工具更新仓库 `Ch1llNoodle/obsidian-media-capture` 至 `0.8.2`。插件显示名称为 Media Capture，手机实际播放与新版界面仍需设备验证。

#### Validation

103 automated tests, strict TypeScript and production builds cover capture, shared artwork, legacy cover reuse, write rules, template updates, associations and deployment. Runtime code uses Obsidian and standard Web APIs; mobile loading is enabled. Actual iOS and Android behavior remains subject to device validation.
