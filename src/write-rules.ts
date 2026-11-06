import type { CaptureMode, CaptureSettingsData, WriteRule } from './types';
import { episodeNotePath, noteValues, renderTemplateBody, relativeNotePath, validateNoteTemplate } from './note-format';
import { isRecord } from './validation';
import { isMarkdownFile } from './storage';
import type { PodcastService } from './service';

export function presetRules(settings: Readonly<CaptureSettingsData>, preset: CaptureMode = settings.captureMode): WriteRule[] {
    if (preset === 'custom' && settings.writeRules) return settings.writeRules.map(rule => ({ ...rule }));
    const catalog: WriteRule = { id: 'catalog', name: '集中清单', enabled: preset === 'log' || preset === 'both', mode: 'append', folder: '',
        pathTemplate: settings.catalogPath, heading: settings.entryHeading, templateFile: '', coverWidth: 24,
        template: settings.rowTemplate.replace(/\{\{date\}\}/g, '{{listened}}').replace(/\{\{title\}\}/g, '{{fullTitle}}') };
    const notes: WriteRule = { id: 'notes', name: '单集笔记', enabled: preset === 'note' || preset === 'both', mode: 'create', folder: settings.noteFolder,
        pathTemplate: settings.notePathTemplate, heading: '', templateFile: settings.noteTemplateFile, template: settings.noteTemplate, coverWidth: 120 };
    const show: WriteRule = { ...notes, id: 'show', name: '按节目追加', enabled: preset === 'show', mode: 'append', pathTemplate: '{{show}}.md', heading: 'Episodes',
        templateFile: '', template: '### {{title}}\n\n{{link}}\n\n{{cover}}\n\n{{description}}' };
    return [catalog, notes, show].map(rule => {
        const configured = settings.writeRules?.find(value => value.id === rule.id && value.mode === rule.mode);
        return configured ? { ...configured, enabled: rule.enabled } : rule;
    });
}

export function rulesFor(settings: Readonly<CaptureSettingsData>, preset?: CaptureMode): WriteRule[] {
    const rules = preset && preset !== 'custom' ? presetRules(settings, preset) : settings.writeRules ?? presetRules(settings);
    return rules.filter(rule => rule.enabled).map(rule => ({ ...rule }));
}

export function validateRules(value: unknown): WriteRule[] {
    if (!Array.isArray(value) || value.length > 20) throw new Error('写入规则必须是数组，最多 20 条。');
    const rules: WriteRule[] = [];
    const ids = new Set<string>();
    for (const input of value as unknown[]) {
        if (!isRecord(input)) throw new Error('每条写入规则必须是对象。');
        const strings = ['id', 'name', 'mode', 'folder', 'pathTemplate', 'heading', 'templateFile', 'template'] as const;
        for (const key of strings) if (typeof input[key] !== 'string') throw new Error(`写入规则的 ${key} 必须是文本。`);
        // Narrow fields individually after checking the external data boundary.
        const id = String(input.id), name = String(input.name), mode = input.mode;
        if (!/^[a-z][a-z0-9-]{0,39}$/.test(id) || ids.has(id)) throw new Error(`规则标识无效或重复：${id}`);
        if (!name.trim() || typeof input.enabled !== 'boolean' || mode !== 'append' && mode !== 'create') throw new Error(`规则 ${id} 的名称、启用状态或写入方式无效。`);
        if (typeof input.coverWidth !== 'number' || !Number.isInteger(input.coverWidth) || input.coverWidth < 16 || input.coverWidth > 600) throw new Error(`规则 ${id} 的封面宽度须为 16～600 的整数。`);
        const rule: WriteRule = { id, name, mode, enabled: input.enabled, coverWidth: input.coverWidth, folder: String(input.folder),
            pathTemplate: String(input.pathTemplate), heading: String(input.heading).trim(), templateFile: String(input.templateFile), template: String(input.template) };
        rule.folder = relativeNotePath(rule.folder, true);
        rule.pathTemplate = rule.pathTemplate.trim().replace(/\\/g, '/');
        relativeNotePath(rule.pathTemplate.replace(/\{\{[^{}]+\}\}/g, 'variable'));
        validateNoteTemplate(rule.pathTemplate, true);
        if (!rule.pathTemplate.toLowerCase().endsWith('.md')) throw new Error(`规则 ${name} 的目标路径必须以 .md 结尾。`);
        rule.templateFile = relativeNotePath(rule.templateFile, true);
        if (rule.templateFile && !rule.templateFile.toLowerCase().endsWith('.md')) throw new Error(`规则 ${name} 的模板必须为 Markdown 文件。`);
        if (!rule.template.trim() || /[\r\n#]/.test(rule.heading)) throw new Error(`规则 ${name} 的模板或目标标题无效。`);
        validateNoteTemplate(rule.template);
        if (mode === 'append' && /^(?:\uFEFF)?---\r?\n/.test(rule.template)) throw new Error(`追加规则 ${name} 的模板应为正文，不能包含文件属性。`);
        if (id === 'catalog' && (mode !== 'append' || !rule.heading || !rule.template.startsWith('- ') || /[\r\n]/.test(rule.template) || !rule.template.includes('{{link}}') || /\{\{/.test(rule.pathTemplate))) throw new Error('集中清单规则须追加到固定路径，并使用含 {{link}} 的单行列表模板，以保留日记与作品关联。');
        ids.add(id); rules.push(rule);
    }
    return rules;
}

export function rulePath(rule: WriteRule, values: ReturnType<typeof noteValues>): string {
    return episodeNotePath({ noteFolder: rule.folder, notePathTemplate: rule.pathTemplate }, values);
}

export async function ruleTemplate(podcast: PodcastService, rule: WriteRule): Promise<string> {
    let template = rule.template;
    if (rule.templateFile) {
        podcast.notes.checkPath(rule.templateFile);
        const file = podcast.app.vault.getAbstractFileByPath(rule.templateFile);
        if (!isMarkdownFile(file)) throw new Error(`规则 ${rule.name}：模板不存在：${rule.templateFile}`);
        template = await podcast.app.vault.read(file);
    }
    validateNoteTemplate(template);
    if (rule.mode === 'append') {
        if (/^(?:\uFEFF)?---\r?\n/.test(template)) throw new Error(`规则 ${rule.name}：追加模板不能包含文件属性。`);
        renderTemplateBody(template, {});
    }
    return template;
}
