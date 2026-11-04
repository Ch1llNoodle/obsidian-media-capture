import { PluginSettingTab, Setting, Notice } from "obsidian";

export class CaptureSettings extends PluginSettingTab {
    constructor(app, plugin) { super(app, plugin.plugin); this.plugin = plugin; }
    display() {
        const container = this.containerEl;
        container.empty();
        new Setting(container).setName("记录输出").setHeading();
        const text = (key, name, description) => new Setting(container).setName(name).setDesc(description).addText(component => {
            component.setValue(this.plugin.config[key]);
            component.inputEl.addEventListener("change", async () => {
                try { await this.plugin.saveSettings({ ...this.plugin.config, [key]: component.getValue() }); }
                catch (error) { new Notice(error.message); }
            });
        });
        const toggle = (key, name, description) => new Setting(container).setName(name).setDesc(description).addToggle(component => component.setValue(this.plugin.config[key]).onChange(async value => {
            try { await this.plugin.saveSettings({ ...this.plugin.config, [key]: value }); }
            catch (error) { new Notice(error.message); }
        }));
        text("catalogPath", "记录文件", "库内 Markdown 路径，例如 Podcasts.md。修改路径不会移动旧文件。");
        text("entryHeading", "记录区标题", "新条目插入此标题下，其他正文保留。");
        text("imageFolder", "封面目录", "库内相对目录，例如 image/podcasts。");
        text("rowTemplate", "单行输出模板", "以 - 开头，保留 {{link}}；可用 date、cover、link、title、url、state、provider。状态和日期标记自动附加。");
        toggle("downloadCovers", "保存本地封面", "关闭后只保存文字与链接，不下载封面。");
        toggle("repairOnStartup", "启动时补全封面", "默认关闭；也可手动运行补全命令。");
        new Setting(container).setName("日记联动（可选）").setHeading();
        toggle("dailyIntegration", "写入日记属性", "默认关闭。开启后，已听过条目可写入对应日期的现有日记，无需 Dataview。");
        text("dailyFolder", "日记目录", "此目录及子目录中的日记文件名使用 YYYY-MM-DD。");
        text("dailyProperty", "日记属性", "保存单集链接的列表属性名称。");
    }
}

