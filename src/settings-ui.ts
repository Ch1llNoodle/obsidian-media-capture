import { t } from './i18n';
import { renderCredentials } from './credential-settings';
import { PluginSettingTab, Setting, Notice, type App } from 'obsidian';
import type { CaptureService } from './service';
import type { TextSettingKey, ToggleSettingKey } from './types';
import { errorMessage } from './validation';
import { recommendationKinds, recommendationNames } from './recommendations';
import { renderRuleSettings } from './rule-settings';
import { NoteRefreshModal } from './note-refresh-ui';

type Page = 'media' | 'records' | 'services' | 'maintenance';
const pages: { id: Page; name: string }[] = [
    { id: 'media', name: '媒体采集' }, { id: 'records', name: '记录与日记' },
    { id: 'services', name: '服务连接' }, { id: 'maintenance', name: '维护' },
];

export class CaptureSettings extends PluginSettingTab {
    private page: Page = 'media';
    private readonly expandedRules = new Set<string>();
    constructor(app: App, private readonly service: CaptureService) { super(app, service.plugin); }
    override display(): void {
        const container = this.containerEl;
        container.empty();
        container.classList.add('media-capture-settings');
        const header = container.createDiv({ cls: 'media-settings-header' });
        new Setting(header).setName('Capture').setDesc(t('设置采集方式、记录联动与服务连接。')).setHeading();
        const navigation = container.createDiv({ cls: 'media-settings-navigation' });
        navigation.setAttribute('role', 'tablist');
        navigation.setAttribute('aria-label', t('Capture 设置'));
        for (const page of pages) {
            const button = navigation.createEl('button', { text: t(page.name), cls: 'media-settings-tab', attr: { type: 'button' } });
            button.id = `media-settings-tab-${page.id}`;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-controls', `media-settings-panel-${page.id}`);
            button.setAttribute('aria-selected', String(page.id === this.page));
            button.tabIndex = page.id === this.page ? 0 : -1;
            button.addEventListener('click', () => this.select(page.id));
            button.addEventListener('keydown', event => {
                const current = pages.findIndex(item => item.id === page.id);
                const index = event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1
                    : event.key === 'ArrowRight' ? (current + 1) % pages.length : event.key === 'ArrowLeft' ? (current + pages.length - 1) % pages.length : -1;
                if (index < 0) return;
                event.preventDefault();
                const next = pages[index];
                if (next) { this.select(next.id); }
            });
        }
        for (const page of pages) {
            const panel = container.createDiv({ cls: 'media-settings-panel' });
            panel.id = `media-settings-panel-${page.id}`;
            panel.hidden = page.id !== this.page;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', `media-settings-tab-${page.id}`);
            if (page.id === this.page) this.renderPage(panel);
        }
    }
    private select(page: Page): void {
        this.page = page;
        this.display();
        this.containerEl.querySelector<HTMLButtonElement>(`#media-settings-tab-${page}`)?.focus();
    }
    private heading(container: HTMLElement, name: string): void { new Setting(container).setName(t(name)).setHeading(); }
    private text(container: HTMLElement, key: TextSettingKey, name: string, description: string, disabled = false): void {
        const row = new Setting(container).setName(t(name)).setDesc(t(description));
        row.setDisabled(disabled);
        row.addText(component => {
            component.setValue(this.service.config[key]).setDisabled(disabled);
            component.inputEl.addEventListener('change', () => {
                void this.service.saveSettings({ ...this.service.config, [key]: component.getValue() })
                    .catch((error: unknown) => { component.setValue(this.service.config[key]); new Notice(errorMessage(error)); });
            });
        });
    }
    private toggle(container: HTMLElement, key: ToggleSettingKey, name: string, description: string, refresh = false, disabled = false): void {
        new Setting(container).setName(t(name)).setDesc(t(description)).setDisabled(disabled)
            .addToggle(component => component.setValue(this.service.config[key]).setDisabled(disabled).onChange(async value => {
                try { await this.service.saveSettings({ ...this.service.config, [key]: value }); if (refresh) this.display(); }
                catch (error) { component.setValue(this.service.config[key]); new Notice(errorMessage(error)); }
            }));
    }
    private renderPage(container: HTMLElement): void {
        const config = this.service.config;
        if (this.page === 'services') { renderCredentials(container, this.service, () => this.display()); return; }
        if (this.page === 'media') {
            this.heading(container, '保存方式');
            renderRuleSettings(container, this.service, () => this.display(), this.expandedRules);
            this.heading(container, '视频与播放');
            this.text(container, 'videoCatalogPath', '视频清单', '视频的一行记录单独写入此文件，复用集中清单的标题与模板。');
            this.toggle(container, 'playbackIntegration', '在 Obsidian 中播放', '需要已配置的兼容播放器，平台链接始终保留。');
            this.heading(container, '封面');
            this.toggle(container, 'downloadCovers', '保存本地封面', '开启后保存封面到本地，重复采集时复用已有图片。', true);
            this.text(container, 'imageFolder', '封面目录', '播客与视频采集共用的本地封面目录。', !config.downloadCovers);
            return;
        }
        if (this.page === 'records') {
            this.heading(container, '任务完成记录');
            this.toggle(container, 'taskCompletionLog', '记录任务完成时间', '将已完成任务、来源链接和完成时刻写入当天日记。', true);
            this.text(container, 'taskLogHeading', '任务记录标题', '写入完成记录的 Markdown 标题，例如 ## 📝 Notes。', !config.taskCompletionLog);
            this.heading(container, '媒体与日记');
            this.toggle(container, 'dailyIntegration', '写入日记属性', '将听过或看过的记录链接写入对应日期的现有日记。', true);
            this.text(container, 'dailyFolder', '日记目录', '此目录及子目录中的日记文件名使用 YYYY-MM-DD。', !config.dailyIntegration);
            this.text(container, 'dailyProperty', '日记属性', '保存媒体记录链接的列表属性名称。', !config.dailyIntegration);
            this.heading(container, '作品关联');
            for (const kind of recommendationKinds) this.text(container, `${kind}Path`, recommendationNames[kind], '用于从播客记录关联已有作品。');
            return;
        }
        this.heading(container, '封面维护');
        this.toggle(container, 'repairOnStartup', '启动时补全封面', '在打开笔记库后检查并补全缺失封面。', false, !config.downloadCovers);
        new Setting(container).setName(t('补全缺失封面')).setDesc(t('检查播客与视频清单，下载缺失的封面。')).addButton(button => {
            button.setButtonText(t('补全封面')).setDisabled(!config.downloadCovers).onClick(async () => {
                button.setDisabled(true);
                try { await this.service.repairCovers(); }
                catch (error) { new Notice(errorMessage(error)); }
                finally { button.setDisabled(!this.service.config.downloadCovers); }
            });
        });
        this.heading(container, '模板更新');
        new Setting(container).setName(t('将模板应用到已有记录')).setDesc(t('预览并选择要更新的记录。新建规则重写整个文件；追加规则更新管理区域。更新前保存完整备份。'))
            .addButton(button => button.setButtonText(t('预览并选择')).onClick(() => new NoteRefreshModal(this.service).open()));
    }
}
