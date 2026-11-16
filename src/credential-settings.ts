import { t } from './i18n';
import { Setting, Notice } from 'obsidian';
import type { SettingsAccess } from './types';
import { requiredServices, serviceDefinitions } from './modules';
import { errorMessage } from './validation';

export function renderCredentials(container: HTMLElement, service: SettingsAccess): void {
    const required = requiredServices(service.config);
    if (!required.size) {
        container.createEl('p', { cls: 'media-settings-note', text: t('已启用的功能无需服务凭证。') });
        return;
    }
    let queue: Promise<void> = Promise.resolve();
    for (const source of serviceDefinitions.filter(source => required.has(source.id))) {
        const row = new Setting(container).setName(t(source.name)).setDesc(t(source.description));
        row.settingEl.classList.add('media-settings-service');
        row.addText(component => {
            const current = (): string => service.config.credentials.find(entry => entry.name === source.id)?.value ?? '';
            component.setValue(current()).setPlaceholder(t('未填写'));
            component.inputEl.type = 'password';
            component.inputEl.autocomplete = 'off';
            component.inputEl.setAttribute('aria-label', t(source.name) + ' · ' + t('凭证值'));
            component.inputEl.addEventListener('change', () => {
                const value = component.getValue();
                const work = queue.then(async () => {
                    const credentials = service.config.credentials.filter(entry => entry.name !== source.id);
                    if (value) credentials.push({ name: source.id, value });
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
    container.createEl('p', { cls: 'media-settings-note', text: t('只显示已启用功能使用的服务。关闭功能会保留已填写的凭证。') });
}
