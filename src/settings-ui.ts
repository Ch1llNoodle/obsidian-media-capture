import { PluginSettingTab, Setting, Notice, type App } from "obsidian";

import type { PodcastService } from "./service";
import type { TextSettingKey, ToggleSettingKey } from "./types";
import { errorMessage } from "./validation";
import { recommendationKinds, recommendationNames } from "./recommendations";
import { renderRuleSettings } from './rule-settings';
import { NoteRefreshModal } from './note-refresh-ui';

export class CaptureSettings extends PluginSettingTab {
    private readonly plugin: PodcastService;
    constructor(app: App, plugin: PodcastService) { super(app, plugin.plugin); this.plugin = plugin; }
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
        new Setting(container).setName('播放器联动').setDesc('视频清单提供“打开媒体”入口；需另行启用 Media Extended v4。模板支持 {{mediaLink}}、{{mediaUrl}}。Bilibili 播放需配置其桌面 Web Viewer，采集保存可独立使用。');
        new Setting(container).setName("封面").setHeading();
        text("imageFolder", "封面目录", "所有写入规则共用的本地封面目录。");
        toggle("downloadCovers", "保存本地封面", "关闭后只保存文字与链接，不下载封面。");
        toggle("repairOnStartup", "启动时补全封面", "默认关闭；也可手动运行补全命令。");
        new Setting(container).setName('将模板应用到已有记录').setDesc('默认用于新增记录。主动更新时先预览，再选择目标并备份；追加规则保留区域外的手写内容。')
            .addButton(button => button.setButtonText('预览并选择').onClick(() => new NoteRefreshModal(this.plugin).open()));
        new Setting(container).setName("日记联动（可选）").setHeading();
        toggle("dailyIntegration", "写入日记属性", "默认关闭。开启后，已听过条目可写入对应日期的现有日记，无需 Dataview。");
        text("dailyFolder", "日记目录", "此目录及子目录中的日记文件名使用 YYYY-MM-DD。");
        text("dailyProperty", "日记属性", "保存单集链接的列表属性名称。");
        new Setting(container).setName("已有作品清单").setHeading();
        for (const kind of recommendationKinds) text(`${kind}Path`, recommendationNames[kind], "已同步或导入的 Markdown 清单路径。关联只修改已有作品，不创建文件。");
    }
}

