import { Setting, Notice } from 'obsidian';
import type { CaptureService } from './service';
import type { Credential } from './types';
import { errorMessage } from './validation';

export function renderCredentials(container: HTMLElement, service: CaptureService, refresh: () => void): void {
    new Setting(container).setName('自定义凭证').setHeading();
    new Setting(container).setName('字段与值').setDesc('供笔记脚本按字段名读取。字段名区分大小写；值按密码显示，以明文保存在插件配置中。');
    const save = async (credentials: Credential[]) => {
        try { await service.saveSettings({ ...service.config, credentials }); return true; }
        catch (error) { new Notice(errorMessage(error)); return false; }
    };
    service.config.credentials.forEach((entry, index) => {
        let name = entry.name, value = entry.value;
        const row = new Setting(container);
        row.settingEl.classList.add('media-capture-credential');
        const update = async () => {
            const credentials = service.config.credentials.map(item => ({ ...item }));
            if (!credentials[index] || credentials[index].name !== entry.name) { refresh(); return; }
            credentials[index] = { name, value };
            if (await save(credentials)) refresh();
        };
        row.addText(component => {
            component.setPlaceholder('字段名').setValue(name);
            component.inputEl.setAttribute('aria-label', '凭证字段名');
            component.inputEl.addEventListener('change', () => { name = component.getValue(); void update(); });
        }).addText(component => {
            component.setPlaceholder('值').setValue(value);
            component.inputEl.type = 'password';
            component.inputEl.autocomplete = 'off';
            component.inputEl.setAttribute('aria-label', '凭证值');
            component.inputEl.addEventListener('change', () => { value = component.getValue(); void update(); });
        }).addExtraButton(button => button.setIcon('trash-2').setTooltip('删除凭证').onClick(async () => {
            const credentials = service.config.credentials.filter(item => item.name !== entry.name);
            if (await save(credentials)) refresh();
        }));
    });
    new Setting(container).addButton(button => button.setButtonText('添加凭证').onClick(async () => {
        const names = new Set(service.config.credentials.map(entry => entry.name));
        let number = 1;
        while (names.has(`key${number}`)) number++;
        if (await save([...service.config.credentials, { name: `key${number}`, value: '' }])) refresh();
    }));
}
