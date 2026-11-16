import { renderGettingStarted } from './getting-started';
import { t } from './i18n';
import { renderCredentials } from './credential-settings';
import { PluginSettingTab, Setting, Notice, type App } from 'obsidian';
import type { CaptureService } from './service';
import { ModuleSettingsView } from './module-settings';
import { errorMessage } from './validation';
import { NoteRefreshModal } from './note-refresh-ui';

type Page = 'start' | 'modules' | 'services' | 'maintenance';
const pages: { id: Page; name: string }[] = [
    { id: 'start', name: '开始使用' },
    { id: 'modules', name: '功能' },
    { id: 'services', name: '服务连接' }, { id: 'maintenance', name: '维护' },
];

export class CaptureSettings extends PluginSettingTab {
    private page: Page = 'start';
    private readonly modules: ModuleSettingsView;
    constructor(app: App, private readonly service: CaptureService) { super(app, service.plugin); this.modules = new ModuleSettingsView(service, () => this.display(), () => this.select('services')); }
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
    private renderPage(container: HTMLElement): void {
        const config = this.service.config;
        if (this.page === 'start') { renderGettingStarted(container, this.service, { modules: () => this.select('modules'), services: () => this.select('services'), refresh: () => this.display() }); return; }
        if (this.page === 'modules') { this.modules.render(container); return; }
        if (this.page === 'services') { renderCredentials(container, this.service); return; }
        if (!config.modules.media) {
            container.createEl('p', { cls: 'media-settings-note', text: t('已启用的功能没有维护操作。') });
            return;
        }
        this.heading(container, '封面维护');
        new Setting(container).setName(t('启动时补全封面')).setDesc(t('在打开笔记库后检查并补全缺失封面。')).setDisabled(!config.downloadCovers)
            .addToggle(component => component.setValue(config.repairOnStartup).setDisabled(!config.downloadCovers).onChange(async value => {
                try { await this.service.saveSettings({ ...this.service.config, repairOnStartup: value }); }
                catch (error) { component.setValue(this.service.config.repairOnStartup); new Notice(errorMessage(error)); }
            }));
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
