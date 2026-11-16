import { renderModuleHelp } from './module-help';
import { Setting, Notice } from 'obsidian';
import { t } from './i18n';
import type { CaptureService } from './service';
import type { TextSettingKey, ToggleSettingKey } from './types';
import { moduleDefinitions, dailySourceDefinitions, type ModuleId } from './modules';
import { renderRuleSettings } from './rule-settings';
import { recommendationKinds, recommendationNames } from './recommendations';
import { errorMessage } from './validation';

export class ModuleSettingsView {
    readonly expanded = new Set<ModuleId>(['media']);
    readonly expandedRules = new Set<string>();
    constructor(private readonly service: CaptureService, private readonly refresh: () => void, private readonly openServices: () => void) {}
    render(container: HTMLElement): void {
        for (const module of moduleDefinitions) {
            const card = container.createDiv({ cls: 'media-settings-module media-settings-rule' });
            new Setting(card).setName(t(module.name)).setDesc(t(module.description)).addToggle(component => {
                component.setValue(this.service.config.modules[module.id]).onChange(async value => {
                    try {
                        await this.service.saveSettings({ ...this.service.config, modules: { ...this.service.config.modules, [module.id]: value } });
                        if (value) this.expanded.add(module.id); else this.expanded.delete(module.id);
                        this.refresh();
                    } catch (error) { component.setValue(this.service.config.modules[module.id]); new Notice(errorMessage(error)); }
                });
            });
            renderModuleHelp(card, module.id);
            if (!this.service.config.modules[module.id]) continue;
            if (module.services.length) new Setting(card).addButton(button => button.setButtonText(t('配置服务连接')).onClick(this.openServices));
            if (!['media', 'tasks', 'daily'].includes(module.id)) {
                card.createEl('p', { cls: 'media-settings-note', text: module.services.length ? t('在服务连接中填写此功能使用的凭证。') : t('记录位置与显示方式由笔记库指定。') });
                continue;
            }
            const details = card.createEl('details', { cls: 'media-rule-settings', attr: { 'data-module-id': module.id } });
            details.open = this.expanded.has(module.id);
            details.addEventListener('toggle', () => { if (details.open) this.expanded.add(module.id); else this.expanded.delete(module.id); });
            details.createEl('summary', { text: t('功能设置') });
            this.renderModule(details, module.id);
        }
    }
    private heading(container: HTMLElement, name: string): void { new Setting(container).setName(t(name)).setHeading(); }
    private text(container: HTMLElement, key: TextSettingKey, name: string, description: string, disabled = false): void {
        new Setting(container).setName(t(name)).setDesc(t(description)).setDisabled(disabled).addText(component => {
            component.setValue(this.service.config[key]).setDisabled(disabled);
            component.inputEl.addEventListener('change', () => {
                void this.service.saveSettings({ ...this.service.config, [key]: component.getValue() }).catch(error => {
                    component.setValue(this.service.config[key]); new Notice(errorMessage(error));
                });
            });
        });
    }
    private toggle(container: HTMLElement, key: ToggleSettingKey, name: string, description: string, refresh = false): void {
        new Setting(container).setName(t(name)).setDesc(t(description)).addToggle(component => {
            component.setValue(this.service.config[key]).onChange(async value => {
                try { await this.service.saveSettings({ ...this.service.config, [key]: value }); if (refresh) this.refresh(); }
                catch (error) { component.setValue(this.service.config[key]); new Notice(errorMessage(error)); }
            });
        });
    }
    private renderModule(container: HTMLElement, id: ModuleId): void {
        const config = this.service.config;
        if (id === 'tasks') {
            this.text(container, 'taskLogHeading', '任务记录标题', '写入完成记录的 Markdown 标题，例如 ## 📝 Notes。');
            return;
        }
        if (id === 'daily') {
            for (const source of dailySourceDefinitions) new Setting(container).setName(t(source.name)).addDropdown(component => {
                component.addOptions({ none: t('不使用'), [source.provider]: t(source.label) }).setValue(config.dailySources[source.id]).onChange(async value => {
                    try { await this.service.saveSettings({ ...this.service.config, dailySources: { ...this.service.config.dailySources, [source.id]: value } }); }
                    catch (error) { component.setValue(this.service.config.dailySources[source.id]); new Notice(errorMessage(error)); }
                });
            });
            return;
        }
        this.heading(container, '保存方式');
        renderRuleSettings(container, this.service, this.refresh, this.expandedRules);
        this.heading(container, '视频与播放');
        this.text(container, 'videoCatalogPath', '视频清单', '视频的一行记录单独写入此文件，复用集中清单的标题与模板。');
        this.toggle(container, 'playbackIntegration', '在 Obsidian 中播放', '需要已配置的兼容播放器，平台链接始终保留。');
        this.heading(container, '封面');
        this.toggle(container, 'downloadCovers', '保存本地封面', '开启后保存封面到本地，重复采集时复用已有图片。', true);
        this.text(container, 'imageFolder', '封面目录', '播客与视频采集共用的本地封面目录。', !config.downloadCovers);
        this.heading(container, '媒体与日记');
        this.toggle(container, 'dailyIntegration', '写入日记属性', '将听过或看过的记录链接写入对应日期的现有日记。', true);
        this.text(container, 'dailyFolder', '日记目录', '此目录及子目录中的日记文件名使用 YYYY-MM-DD。', !config.dailyIntegration);
        this.text(container, 'dailyProperty', '日记属性', '保存媒体记录链接的列表属性名称。', !config.dailyIntegration);
        this.heading(container, '作品关联');
        for (const kind of recommendationKinds) this.text(container, `${kind}Path`, recommendationNames[kind], '用于从播客记录关联已有作品。');
    }
}
