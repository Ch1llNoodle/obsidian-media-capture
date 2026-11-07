import { PluginSettingTab, Setting, Notice, type App } from "obsidian";

import type { CaptureService } from "./service";
import type { TextSettingKey, ToggleSettingKey } from "./types";
import { errorMessage } from "./validation";
import { recommendationKinds, recommendationNames } from "./recommendations";
import { renderRuleSettings } from './rule-settings';
import { NoteRefreshModal } from './note-refresh-ui';

export class CaptureSettings extends PluginSettingTab {
    private readonly plugin: CaptureService;
    constructor(app: App, plugin: CaptureService) { super(app, plugin.plugin); this.plugin = plugin; }
    override display(): void {
        const container = this.containerEl;
        container.empty();
        new Setting(container).setName("写入规则").setHeading();
        renderRuleSettings(container, this.plugin, () => this.display());
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
        text('videoCatalogPath', '视频清单', '视频的一行记录单独写入此文件，复用集中清单的标题与模板。');
        toggle('playbackIntegration', '在 Obsidian 中播放', '默认关闭。开启后显示播放入口，并启用 {{mediaLink}}、{{mediaUrl}}；需要已配置的兼容播放器。关闭时保留平台链接。');
        new Setting(container).setName("封面").setHeading();
        text("imageFolder", "封面目录", "所有写入规则共用的本地封面目录。");
        toggle("downloadCovers", "保存本地封面", "开启后保存封面到本地，重复采集时复用已有图片。");
        toggle("repairOnStartup", "启动时补全封面", "默认关闭；也可手动运行补全命令。");
        new Setting(container).setName('将模板应用到已有记录').setDesc('预览并选择要更新的记录。新建规则重写整个文件；追加规则更新管理区域。更新前保存完整备份。')
            .addButton(button => button.setButtonText('预览并选择').onClick(() => new NoteRefreshModal(this.plugin).open()));
        new Setting(container).setName("日记联动（可选）").setHeading();
        toggle("dailyIntegration", "写入日记属性", "默认关闭。开启后，将听过或看过的记录链接写入对应日期的现有日记。");
        text("dailyFolder", "日记目录", "此目录及子目录中的日记文件名使用 YYYY-MM-DD。");
        text("dailyProperty", "日记属性", "保存媒体记录链接的列表属性名称。");
        new Setting(container).setName("已有作品清单").setHeading();
        for (const kind of recommendationKinds) text(`${kind}Path`, recommendationNames[kind], "已同步或导入的 Markdown 清单路径。关联时更新清单中的现有作品。");
    }
}

