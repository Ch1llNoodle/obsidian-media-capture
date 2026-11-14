import { t } from './i18n';
import { Notice, Setting } from 'obsidian';
import type { CapturePreset, SettingsAccess, WriteRule } from './types';
import type { App } from 'obsidian';
import { presetRules } from './write-rules';
import { NoteTemplatePicker } from './note-ui';
import { errorMessage } from './validation';

export function renderRuleSettings(container: HTMLElement, podcast: SettingsAccess & { readonly app: App }, refresh: () => void): void {
    const rules = podcast.config.writeRules;
    const save = async (updated: WriteRule[]): Promise<void> => { await podcast.saveSettings({ ...podcast.config, writeRules: updated }); };
    let queue: Promise<void> = Promise.resolve();
    const mutate = (update: (current: WriteRule[]) => WriteRule[]): Promise<void> => {
        const work = queue.then(() => save(update(podcast.config.writeRules)));
        queue = work.catch(() => {});
        return work;
    };
    const change = (id: string, patch: Partial<WriteRule>): Promise<void> => mutate(current => current.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
    const run = (work: Promise<void>, redraw = false): void => {
        void work.then(() => { if (redraw) refresh(); }).catch((error: unknown) => new Notice(errorMessage(error)));
    };
    let preset: CapturePreset = 'log';
    new Setting(container).setName(t("常用预设")).setDesc(t("应用预设会替换下面的规则配置，已有文件保留。"))
        .addDropdown(component => component.addOptions({ log: t("集中清单"), note: t("每条一篇"), both: t("清单与独立笔记"), show: t("按节目／频道追加") }).setValue(preset).onChange(value => {
            if (value === 'log' || value === 'note' || value === 'both' || value === 'show') preset = value;
        })).addButton(button => button.setButtonText(t("应用预设")).onClick(() => run(mutate(() => presetRules(podcast.config, preset)), true)));
    for (const rule of rules) {
        new Setting(container).setName(rule.name).setDesc(rule.mode === 'append' ? t("将模板内容追加到目标文件") : t("按路径模板新建文件"))
            .addToggle(toggle => toggle.setValue(rule.enabled).onChange(value => run(change(rule.id, { enabled: value }))));
        const details = container.createEl('details', { cls: 'media-rule-settings' });
        details.setAttribute('data-rule-id', rule.id);
        details.createEl('summary', { text: t("编辑规则") });
        const field = (key: 'name' | 'folder' | 'pathTemplate' | 'heading' | 'templateFile', label: string, description: string): Setting =>
            new Setting(details).setName(label).setDesc(description).addText(component => {
                component.setValue(rule[key]);
                component.inputEl.addEventListener('change', () => run(change(rule.id, { [key]: component.getValue() })));
            });
        field('name', t("名称"), t("在添加窗口与结果中显示。"));
        new Setting(details).setName(t("写入方式")).addDropdown(component => {
            component.addOptions(rule.id === 'catalog' ? { append: t("追加到文件") } : { append: t("追加到文件"), create: t("新建文件") }).setValue(rule.mode).onChange(value => {
                if (value === 'append' || value === 'create') run(change(rule.id, { mode: value }), true);
            });
        });
        field('folder', t("目录"), t("库内相对目录，留空使用库根目录。"));
        field('pathTemplate', t("文件路径模板"), t("目录内的 Markdown 路径。例如 Records.md、{{show}}.md、{{show}}/{{title}}.md。"));
        if (rule.mode === 'append') field('heading', t("追加位置"), t("目标标题，留空追加到文件末尾。集中清单需要保留目标标题。"));
        field('templateFile', t("Markdown 模板文件"), t("留空使用下面的内容模板。追加规则使用正文模板，新建规则可以包含属性。"))
            .addButton(button => button.setButtonText(t("选择")).onClick(() => new NoteTemplatePicker(podcast, refresh, path => change(rule.id, { templateFile: path })).open()));
        new Setting(details).setName(t("内容模板")).setDesc(t("所有规则共用变量：节目、标题、链接、封面和日期等。")).addTextArea(component => {
            component.setValue(rule.template); component.inputEl.rows = 8;
            component.inputEl.addEventListener('change', () => run(change(rule.id, { template: component.getValue() })));
        });
        new Setting(details).setName(t("封面宽度")).setDesc(t("16～600，单位为像素。")).addText(component => {
            component.setValue(String(rule.coverWidth));
            component.inputEl.addEventListener('change', () => run(change(rule.id, { coverWidth: Number(component.getValue()) })));
        });
        new Setting(details).setName(t("移除此规则")).addButton(button => button.setButtonText(t("移除")).onClick(() => run(mutate(current => current.filter(value => value.id !== rule.id)), true)));
    }
    new Setting(container).setName(t("添加写入规则")).setDesc(t("可以同时启用多条规则。"))
        .addButton(button => button.setButtonText(t("添加")).onClick(() => {
            const base = presetRules(podcast.config, 'show').find(rule => rule.id === 'show');
            if (base) run(mutate(current => [...current, { ...base, id: 'output-' + Date.now().toString(36), name: t("新规则"), enabled: false }]), true);
        }));
}
