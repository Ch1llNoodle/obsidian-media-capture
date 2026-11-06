### Podcast Capture 0.7.0

Podcast Capture uses one template and write-rule system for concentrated logs, individual notes, and files grouped by show. The default remains one row per episode.

#### Templates and destinations

Each rule selects its content template, folder, path pattern, append or create method, and optional target heading. Enable several rules to produce several outputs from one capture. Presets cover a concentrated log, one file per episode, both, and one file per show. Template variables are shared across all outputs. Cover retrieval and daily linking run once per capture.

Settings now edit rules directly. Existing 0.6.x paths, templates, identifiers, and output choices remain compatible. Work associations continue to use the concentrated log rule.

#### Existing records

Template updates preview replacements per file. Create outputs regenerate the selected file; append outputs replace managed entries while retaining surrounding handwritten text, work children, and quotations. Several episodes in one show file are updated together, with one verified backup. Results identify failed stages and saved files, with backup viewing inside Obsidian. Live Preview hides management markers in tracked show files as well as the main log.

#### 使用

重新加载插件后，在设置的“写入规则”中应用预设或编辑规则。按节目记录可选择“按节目追加”，默认将同一节目的多集内容写入一篇笔记。添加窗口选择“使用已启用规则”沿用配置，也可只为本次选择其他预设。

需要更新旧内容时，使用“将模板应用到已有记录 → 预览并选择”。追加规则保留管理区域外的正文，新建规则会重新生成所选文件全文；每篇先备份后替换，结果中可直接查看原文。

发布附件为 main.js、manifest.json、styles.css，不包含个人 data.json。旧配置继续可用，部署保留个人数据。

#### Validation

Strict TypeScript, production bundling, ESLint, and 95 automated tests cover legacy compatibility, rule execution, grouped append, shared template variables, duplicate capture, original dates, file collisions, rename recovery, per-file template updates, recommendations, and deployment. Android and iOS loading is enabled; the new rule settings and grouped output still need real-device validation. The interface uses Chinese.
