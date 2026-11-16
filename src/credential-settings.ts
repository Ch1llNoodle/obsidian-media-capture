import { t } from './i18n';
import { Setting, Notice } from 'obsidian';
import type { Credential, SettingsAccess } from './types';
import { errorMessage } from './validation';

function renderCustomCredentials(container: HTMLElement, service: SettingsAccess, refresh: () => void): void {
    container.createEl('p', { cls: 'setting-item-description', text: t('额外服务使用的字段与值。') });
    const save = async (credentials: Credential[]) => {
        try { await service.saveSettings({ ...service.config, credentials }); return true; }
        catch (error) { new Notice(errorMessage(error)); return false; }
    };
    service.config.credentials.filter(entry => !serviceNames.has(entry.name)).forEach(entry => {
        let name = entry.name, value = entry.value;
        const row = new Setting(container);
        row.settingEl.classList.add('media-capture-credential');
        const update = async () => {
            const credentials = service.config.credentials.map(item => ({ ...item }));
            const index = credentials.findIndex(item => item.name === entry.name);
            if (index < 0) return;
            credentials[index] = { name, value };
            if (await save(credentials)) refresh();
        };
        row.addText(component => {
            component.setPlaceholder(t("字段名")).setValue(name);
            component.inputEl.setAttribute('aria-label', t("凭证字段名"));
            component.inputEl.addEventListener('change', () => { name = component.getValue(); void update(); });
        }).addText(component => {
            component.setPlaceholder(t("值")).setValue(value);
            component.inputEl.type = 'password';
            component.inputEl.autocomplete = 'off';
            component.inputEl.setAttribute('aria-label', t("凭证值"));
            component.inputEl.addEventListener('change', () => { value = component.getValue(); void update(); });
        }).addExtraButton(button => button.setIcon('trash-2').setTooltip(t("删除凭证")).onClick(async () => {
            const credentials = service.config.credentials.filter(item => item.name !== entry.name);
            if (await save(credentials)) refresh();
        }));
    });
    new Setting(container).addButton(button => button.setButtonText(t("添加凭证")).onClick(async () => {
        const names = new Set(service.config.credentials.map(entry => entry.name));
        let number = 1;
        while (names.has(`key${number}`)) number++;
        if (await save([...service.config.credentials, { name: `key${number}`, value: '' }])) refresh();
    }));
}

const services = [
    { group: '影视与学习', name: 'tmdbToken', label: 'TMDB', description: '搜索电视剧、获取季度与分集。使用 API Read Access Token。' },
    { group: '影视与学习', name: 'maimemoToken', label: '墨墨背单词', description: '同步当天的新学与复习词数。' },
    { group: '地点与日记', name: 'amapKey', label: '高德地图', description: '地点搜索与日记天气共用的 Web 服务 Key。' },
    { group: '地点与日记', name: 'tencentMapKey', label: '腾讯地图', description: '通过 IP 获取日记所在地。' },
    { group: '地点与日记', name: 'deepseekKey', label: 'DeepSeek', description: '根据日记中的位置与天气生成问候语。' },
    { group: '地点与日记', name: 'jinrishiciToken', label: '今日诗词', description: '获取日记中的每日诗词。' },
];
const serviceNames = new Set(services.map(service => service.name));
export function renderCredentials(container: HTMLElement, service: SettingsAccess, refresh: () => void): void {
    let group = '';
    let queue: Promise<void> = Promise.resolve();
    for (const source of services) {
        if (source.group !== group) { group = source.group; new Setting(container).setName(t(group)).setHeading(); }
        const row = new Setting(container).setName(t(source.label)).setDesc(t(source.description));
        row.settingEl.classList.add('media-settings-service');
        row.addText(component => {
            const current = (): string => service.config.credentials.find(entry => entry.name === source.name)?.value ?? '';
            component.setValue(current()).setPlaceholder(t('未填写'));
            component.inputEl.type = 'password';
            component.inputEl.autocomplete = 'off';
            component.inputEl.setAttribute('aria-label', t(source.label) + ' · ' + t('凭证值'));
            component.inputEl.addEventListener('change', () => {
                const value = component.getValue();
                const work = queue.then(async () => {
                    const credentials = service.config.credentials.filter(entry => entry.name !== source.name);
                    if (value) credentials.push({ name: source.name, value });
                    await service.saveSettings({ ...service.config, credentials });
                });
                queue = work.catch(error => { component.setValue(current()); new Notice(errorMessage(error)); });
            });
            row.addExtraButton(button => button.setIcon('eye').setTooltip(t('显示凭证')).onClick(() => {
                const showing = component.inputEl.type === 'password';
                component.inputEl.type = showing ? 'text' : 'password';
                button.setIcon(showing ? 'eye-off' : 'eye').setTooltip(t(showing ? '隐藏凭证' : '显示凭证'));
            }));
        });
    }
    const note = container.createEl('p', { cls: 'media-settings-note', text: t('按需填写使用的服务。凭证保存在本库配置中，输入框默认隐藏内容。') });
    note.setAttribute('role', 'note');
    const details = container.createEl('details', { cls: 'media-settings-custom-credentials' });
    details.open = service.config.credentials.some(entry => !serviceNames.has(entry.name));
    details.createEl('summary', { text: t('其他凭证') });
    renderCustomCredentials(details, service, refresh);
}
