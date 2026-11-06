import { Notice, Setting } from 'obsidian';
import type { CaptureService } from './service';
import type { CaptureMode, WriteRule } from './types';
import { presetRules } from './write-rules';
import { NoteTemplatePicker } from './note-ui';
import { errorMessage } from './validation';

export function renderRuleSettings(container: HTMLElement, podcast: CaptureService, refresh: () => void): void {
    const rules = podcast.config.writeRules ?? presetRules(podcast.config);
    const save = async (updated: WriteRule[]): Promise<void> => { await podcast.saveSettings({ ...podcast.config, writeRules: updated }); };
    let queue: Promise<void> = Promise.resolve();
    const mutate = (update: (current: WriteRule[]) => WriteRule[]): Promise<void> => {
        const work = queue.then(() => save(update(podcast.config.writeRules ?? rules)));
        queue = work.catch(() => {});
        return work;
    };
    const change = (id: string, patch: Partial<WriteRule>): Promise<void> => mutate(current => current.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
    const run = (work: Promise<void>, redraw = false): void => {
        void work.then(() => { if (redraw) refresh(); }).catch((error: unknown) => new Notice(errorMessage(error)));
    };
    let preset: CaptureMode = 'log';
    new Setting(container).setName('常用预设').setDesc('应用预设会替换下面的规则配置，已有文件保留。')
        .addDropdown(component => component.addOptions({ log: '集中清单', note: '每条一篇', both: '清单与独立笔记', show: '按节目／频道追加' }).setValue(preset).onChange(value => {
            if (value === 'log' || value === 'note' || value === 'both' || value === 'show') preset = value;
        })).addButton(button => button.setButtonText('应用预设').onClick(() => run(mutate(() => presetRules(podcast.config, preset)), true)));
    for (const rule of rules) {
        new Setting(container).setName(rule.name).setDesc(rule.mode === 'append' ? '将模板内容追加到目标文件' : '按路径模板新建文件')
            .addToggle(toggle => toggle.setValue(rule.enabled).onChange(value => run(change(rule.id, { enabled: value }))));
        const details = container.createEl('details', { cls: 'podcast-rule-settings' });
        details.setAttribute('data-rule-id', rule.id);
        details.createEl('summary', { text: '编辑规则' });
        const field = (key: 'name' | 'folder' | 'pathTemplate' | 'heading' | 'templateFile', label: string, description: string): Setting =>
            new Setting(details).setName(label).setDesc(description).addText(component => {
                component.setValue(rule[key]);
                component.inputEl.addEventListener('change', () => run(change(rule.id, { [key]: component.getValue() })));
            });
        field('name', '名称', '在添加窗口与结果中显示。');
        new Setting(details).setName('写入方式').addDropdown(component => {
            component.addOptions(rule.id === 'catalog' ? { append: '追加到文件' } : { append: '追加到文件', create: '新建文件' }).setValue(rule.mode).onChange(value => {
                if (value === 'append' || value === 'create') run(change(rule.id, { mode: value }), true);
            });
        });
        field('folder', '目录', '库内相对目录，留空使用库根目录。');
        field('pathTemplate', '文件路径模板', '目录内的 Markdown 路径。例如 Records.md、{{show}}.md、{{show}}/{{title}}.md。');
        if (rule.mode === 'append') field('heading', '追加位置', '目标标题，留空追加到文件末尾。集中清单需要保留目标标题。');
        field('templateFile', 'Markdown 模板文件', '留空使用下面的内容模板。追加规则使用正文模板，新建规则可以包含属性。')
            .addButton(button => button.setButtonText('选择').onClick(() => new NoteTemplatePicker(podcast, refresh, path => change(rule.id, { templateFile: path })).open()));
        new Setting(details).setName('内容模板').setDesc('所有规则共用变量：节目、标题、链接、封面和日期等。').addTextArea(component => {
            component.setValue(rule.template); component.inputEl.rows = 8;
            component.inputEl.addEventListener('change', () => run(change(rule.id, { template: component.getValue() })));
        });
        new Setting(details).setName('封面宽度').setDesc('16～600，单位为像素。').addText(component => {
            component.setValue(String(rule.coverWidth));
            component.inputEl.addEventListener('change', () => run(change(rule.id, { coverWidth: Number(component.getValue()) })));
        });
        new Setting(details).setName('移除此规则').addButton(button => button.setButtonText('移除').onClick(() => run(mutate(current => current.filter(value => value.id !== rule.id)), true)));
    }
    new Setting(container).setName('添加写入规则').setDesc('可以同时启用多条规则。')
        .addButton(button => button.setButtonText('添加').onClick(() => {
            const base = presetRules(podcast.config, 'show').find(rule => rule.id === 'show');
            if (base) run(mutate(current => [...current, { ...base, id: 'output-' + Date.now().toString(36), name: '新规则', enabled: false }]), true);
        }));
}
