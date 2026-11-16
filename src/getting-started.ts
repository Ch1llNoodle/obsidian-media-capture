import { getLanguage, Modal, Notice, Setting } from 'obsidian';
import { manualUrl } from './help-links';
import { t } from './i18n';
import type { CaptureService } from './service';
import { CaptureModal } from './capture-modal';
import { isMarkdownFile } from './storage';
import { errorMessage } from './validation';

interface GuideActions { modules?: () => void; services?: () => void; refresh: () => void }

export function recordDestinations(service: CaptureService): { name: string; path: string }[] {
    return service.config.writeRules.filter(rule => rule.enabled).flatMap(rule => rule.id === 'catalog'
        ? [{ name: t('播客清单'), path: service.config.catalogPath }, { name: t('视频清单'), path: service.config.videoCatalogPath }]
        : [{ name: rule.name, path: [rule.folder, rule.pathTemplate].filter(Boolean).join('/') }]);
}
export function renderGettingStarted(container: HTMLElement, service: CaptureService, actions: GuideActions): void {
    const intro = container.createDiv({ cls: 'media-start-intro' });
    intro.createEl('p', { text: t('先保存第一条播客或视频记录。默认每条一行，无需填写 API Key。') });
    const steps = container.createEl('ol', { cls: 'media-start-steps' });
    steps.createEl('li', { text: t('在小宇宙、Apple Podcasts、豆瓣播客、YouTube 或 Bilibili 复制单集或视频分享链接。') });
    steps.createEl('li', { text: t('选择“采集媒体”，粘贴链接，获取信息后确认标题、状态和日期。') });
    steps.createEl('li', { text: t('确认窗口下方的保存位置，选择“保存并打开”，查看生成的笔记。') });
    if (!service.config.modules.media) {
        new Setting(container).setName(t('先开启媒体采集')).setDesc(t('开启后即可使用采集入口，其他设置保留。')).addButton(button => button.setButtonText(t('开启媒体采集')).onClick(async () => {
            try { await service.saveSettings({ ...service.config, modules: { ...service.config.modules, media: true } }); actions.refresh(); }
            catch (error) { new Notice(errorMessage(error)); }
        }));
    }
    const ready = service.config.modules.media && service.config.writeRules.some(rule => rule.enabled);
    new Setting(container).setName(t('保存第一条记录')).setDesc(t('获取媒体信息需要联网；网页信息不完整时可手动填写标题。')).addButton(button => {
        button.setButtonText(t('采集媒体')).setCta().setDisabled(!ready).onClick(() => new CaptureModal(service).open());
    });
    new Setting(container).setName(t('记录会保存在哪里')).setHeading();
    const destinations = recordDestinations(service);
    if (!destinations.length) container.createEl('p', { cls: 'media-settings-note', text: t('还没有启用的保存方式。在“功能 → 媒体采集 → 功能设置”选择预设并应用。') });
    for (const destination of destinations) {
        const row = new Setting(container).setName(destination.name).setDesc(destination.path);
        // Only open an existing concrete destination; opening the guide never creates notes.
        const file = !destination.path.includes('{{') ? service.app.vault.getAbstractFileByPath(destination.path) : null;
        if (isMarkdownFile(file)) row.addButton(button => button.setButtonText(t('打开记录')).onClick(async () => {
            try { await service.app.workspace.getLeaf(false).openFile(file); }
            catch (error) { new Notice(errorMessage(error)); }
        }));
    }
    container.createEl('p', { cls: 'media-settings-note', text: t('以上是当前设置。文件在首次保存时创建；含双花括号的路径会用节目名、标题等信息替换。') });
    new Setting(container).setName(t('日常怎么打开')).setDesc(t('点击侧栏的采集图标，或打开 Obsidian 命令面板，搜索“Media Capture: 采集媒体”。使用指南也可以从命令面板再次打开。'));
    const details = container.createEl('details', { cls: 'media-start-more' });
    container.createEl('p', { cls: 'media-settings-note', text: t('配套页面可从插件源码的 sample 文件夹获取。把其中的 Capture Sample 整个文件夹复制到笔记库根目录，再打开“Capture Sample/Start”。') });
    container.createEl('a', { text: t('打开 sample 示例文件夹'), href: 'https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample' });
    container.createEl('a', { text: t('打开完整使用手册'), href: manualUrl(getLanguage()) });
    details.createEl('summary', { text: t('接下来可以做什么') });
    new Setting(details).setName(t('改变保存方式')).setDesc(t('在“功能 → 媒体采集 → 功能设置”选择集中清单、每条一篇或按节目追加，再应用预设。'));
    new Setting(details).setName(t('记录任务完成时间')).setDesc(t('先配置 Obsidian 的日记目录和模板，再开启“任务完成记录”。勾选普通 Markdown 任务后，在当天日记查看完成记录。'));
    new Setting(details).setName(t('使用阅读、剧集等追踪功能')).setDesc(t('这些模块需要笔记库提供配套的记录页面；开启开关或填写凭证不会自动生成页面。打开各模块的“怎么使用”查看操作入口和准备事项。'));
    if (actions.modules) new Setting(details).addButton(button => button.setButtonText(t('查看功能与用法')).onClick(() => actions.modules?.()));
    if (actions.services) new Setting(details).addButton(button => button.setButtonText(t('配置服务连接')).onClick(() => actions.services?.()));
}
export class CaptureGuideModal extends Modal {
    constructor(private readonly service: CaptureService) { super(service.app); }
    override onOpen(): void {
        this.contentEl.empty();
        this.contentEl.addClass('media-capture-settings');
        this.contentEl.addClass('media-start-guide');
        this.contentEl.createEl('h2', { text: t('开始使用 Capture') });
        renderGettingStarted(this.contentEl, this.service, { refresh: () => this.onOpen() });
    }
    override onClose(): void { this.contentEl.empty(); }
}
