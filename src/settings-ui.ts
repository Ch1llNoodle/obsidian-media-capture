import { PluginSettingTab, Setting, Notice, type App } from "obsidian";

import type { PodcastService } from "./service";
import type { TextSettingKey, ToggleSettingKey } from "./types";
import { errorMessage } from "./validation";
import { recommendationKinds, recommendationNames } from "./recommendations";
import { captureModes } from './note-format';
import { NoteTemplatePicker } from './note-ui';
import { NoteRefreshModal } from './note-refresh-ui';

export class CaptureSettings extends PluginSettingTab {
    private readonly plugin: PodcastService;
    constructor(app: App, plugin: PodcastService) { super(app, plugin.plugin); this.plugin = plugin; }
    override display(): void {
        const container = this.containerEl;
        container.empty();
        new Setting(container).setName("记录输出").setHeading();
        const text = (key: TextSettingKey, name: string, description: string) => new Setting(container).setName(name).setDesc(description).addText(component => {
            component.setValue(this.plugin.config[key]);
            component.inputEl.addEventListener("change", () => {
                void this.plugin.saveSettings({ ...this.plugin.config, [key]: component.getValue() })
                    .catch((error: unknown) => { new Notice(errorMessage(error)); });
            });
        });
        const toggle = (key: ToggleSettingKey, name: string, description: string) => new Setting(container).setName(name).setDesc(description).addToggle(component => component.setValue(this.plugin.config[key]).onChange(async value => {
            try { await this.plugin.saveSettings({ ...this.plugin.config, [key]: value }); }
            catch (error) { new Notice(errorMessage(error)); }
        }));
        new Setting(container).setName('默认保存方式').setDesc('每次添加时也可单独选择。').addDropdown(dropdown => {
            dropdown.addOptions(captureModes).setValue(this.plugin.config.captureMode).onChange(async value => {
                try { await this.plugin.saveSettings({ ...this.plugin.config, captureMode: value }); }
                catch (error) { new Notice(errorMessage(error)); }
            });
        });
        text("catalogPath", "记录文件", "库内 Markdown 路径，例如 Podcasts.md。修改路径不会移动旧文件。");
        text("entryHeading", "记录区标题", "新条目插入此标题下，其他正文保留。");
        text("imageFolder", "封面目录", "库内相对目录，例如 image/podcasts。");
        text("rowTemplate", "单行输出模板", "以 - 开头，保留 {{link}}；可用 date、cover、link、title、url、state、provider。状态和日期标记自动附加。");
        toggle("downloadCovers", "保存本地封面", "关闭后只保存文字与链接，不下载封面。");
        toggle("repairOnStartup", "启动时补全封面", "默认关闭；也可手动运行补全命令。");
        new Setting(container).setName('单集笔记').setHeading();
        text('noteFolder', '笔记目录', '库内相对目录；留空使用笔记库根目录。');
        text('notePathTemplate', '目录内路径模板', '默认 {{show}}/{{title}}.md，按节目分组。可用 id、provider、published、listened、currentDate；日期支持 :YYYY-MM-DD。');
        text('noteTemplateFile', 'Markdown 模板文件', '留空使用下方模板。保存后可选择将模板应用到已有笔记。')
            .addButton(button => button.setButtonText('选择').onClick(() => new NoteTemplatePicker(this.plugin, () => this.display()).open()))
            .addExtraButton(button => button.setIcon('x').setTooltip('使用下方模板').onClick(() => {
                void this.plugin.saveSettings({ ...this.plugin.config, noteTemplateFile: '' }).then(() => this.display())
                    .catch((error: unknown) => new Notice(errorMessage(error)));
            }));
        new Setting(container).setName('新笔记模板').setDesc('用双花括号插入节目名、标题、链接等变量，完整变量见项目说明文档。不执行模板脚本。').addTextArea(component => {
            component.setValue(this.plugin.config.noteTemplate);
            component.inputEl.rows = 10;
            component.inputEl.addEventListener('change', () => {
                void this.plugin.saveSettings({ ...this.plugin.config, noteTemplate: component.getValue() })
                    .catch((error: unknown) => new Notice(errorMessage(error)));
            });
        });
        new Setting(container).setName('更新已有单集笔记').setDesc('默认只用于新笔记。此操作先预览，可逐篇选择，备份后按当前模板替换全文。')
            .addButton(button => button.setButtonText('预览并选择').onClick(() => new NoteRefreshModal(this.plugin).open()));
        new Setting(container).setName("日记联动（可选）").setHeading();
        toggle("dailyIntegration", "写入日记属性", "默认关闭。开启后，已听过条目可写入对应日期的现有日记，无需 Dataview。");
        text("dailyFolder", "日记目录", "此目录及子目录中的日记文件名使用 YYYY-MM-DD。");
        text("dailyProperty", "日记属性", "保存单集链接的列表属性名称。");
        new Setting(container).setName("已有作品清单").setHeading();
        for (const kind of recommendationKinds) text(`${kind}Path`, recommendationNames[kind], "已同步或导入的 Markdown 清单路径。关联只修改已有作品，不创建文件。");
    }
}

