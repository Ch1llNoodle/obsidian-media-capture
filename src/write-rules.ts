import { t } from './i18n';
import type { CapturePreset, CaptureSettingsData, WriteRule } from './types';
import { episodeNotePath, noteValues, DEFAULT_NOTE_TEMPLATE, renderTemplateBody, relativeNotePath, validateNoteTemplate } from './note-format';
import { isRecord } from './validation';
import { isMarkdownFile } from './storage';
import type { CaptureService } from './service';

export function defaultRules(): WriteRule[] {
    return [
        { id: 'catalog', name: 'Log', enabled: true, mode: 'append', folder: '', pathTemplate: 'Podcasts.md', heading: 'Entries', templateFile: '', coverWidth: 24, template: '- {{listened}} {{cover}} {{link}}' },
        { id: 'notes', name: 'Media note', enabled: false, mode: 'create', folder: 'Media', pathTemplate: '{{show}}/{{title}}.md', heading: '', templateFile: '', template: DEFAULT_NOTE_TEMPLATE, coverWidth: 120 },
        { id: 'show', name: 'Show or channel', enabled: false, mode: 'append', folder: 'Media', pathTemplate: '{{show}}.md', heading: 'Entries', templateFile: '', template: '### {{title}}\n\n{{link}}\n\n{{cover}}\n\n{{description}}', coverWidth: 120 },
    ];
}

export function presetRules(settings: Readonly<CaptureSettingsData>, preset: CapturePreset = 'custom'): WriteRule[] {
    if (preset === 'custom') return settings.writeRules.map(rule => ({ ...rule }));
    return defaultRules().map(rule => {
        const configured = settings.writeRules.find(value => value.id === rule.id && value.mode === rule.mode);
        return { ...(configured ?? rule), enabled: rule.id === 'catalog' ? preset === 'log' || preset === 'both'
            : rule.id === 'notes' ? preset === 'note' || preset === 'both' : preset === 'show' };
    });
}

export function rulesFor(settings: Readonly<CaptureSettingsData>, preset: CapturePreset = 'custom'): WriteRule[] {
    return presetRules(settings, preset).filter(rule => rule.enabled);
}

export function validateRules(value: unknown): WriteRule[] {
    if (!Array.isArray(value) || value.length > 20) throw new Error(t("写入规则必须是数组，最多 20 条。"));
    const rules: WriteRule[] = [];
    const ids = new Set<string>();
    for (const input of value as unknown[]) {
        if (!isRecord(input)) throw new Error(t("每条写入规则必须是对象。"));
        const strings = ['id', 'name', 'mode', 'folder', 'pathTemplate', 'heading', 'templateFile', 'template'] as const;
        for (const key of strings) if (typeof input[key] !== 'string') throw new Error(t("写入规则的 {0} 必须是文本。", key));
        // Narrow fields individually after checking the external data boundary.
        const id = String(input.id), name = String(input.name), mode = input.mode;
        if (!/^[a-z][a-z0-9-]{0,39}$/.test(id) || ids.has(id)) throw new Error(t("规则标识无效或重复：{0}", id));
        if (!name.trim() || typeof input.enabled !== 'boolean' || mode !== 'append' && mode !== 'create') throw new Error(t("规则 {0} 的名称、启用状态或写入方式无效。", id));
        if (typeof input.coverWidth !== 'number' || !Number.isInteger(input.coverWidth) || input.coverWidth < 16 || input.coverWidth > 600) throw new Error(t("规则 {0} 的封面宽度须为 16～600 的整数。", id));
        const rule: WriteRule = { id, name, mode, enabled: input.enabled, coverWidth: input.coverWidth, folder: String(input.folder),
            pathTemplate: String(input.pathTemplate), heading: String(input.heading).trim(), templateFile: String(input.templateFile), template: String(input.template) };
        rule.folder = relativeNotePath(rule.folder, true);
        rule.pathTemplate = rule.pathTemplate.trim().replace(/\\/g, '/');
        relativeNotePath(rule.pathTemplate.replace(/\{\{[^{}]+\}\}/g, 'variable'));
        validateNoteTemplate(rule.pathTemplate, true);
        if (!rule.pathTemplate.toLowerCase().endsWith('.md')) throw new Error(t("规则 {0} 的目标路径必须以 .md 结尾。", name));
        rule.templateFile = relativeNotePath(rule.templateFile, true);
        if (rule.templateFile && !rule.templateFile.toLowerCase().endsWith('.md')) throw new Error(t("规则 {0} 的模板必须为 Markdown 文件。", name));
        if (!rule.template.trim() || /[\r\n#]/.test(rule.heading)) throw new Error(t("规则 {0} 的模板或目标标题无效。", name));
        validateNoteTemplate(rule.template);
        if (mode === 'append' && /^(?:\uFEFF)?---\r?\n/.test(rule.template)) throw new Error(t("追加规则 {0} 的模板应为正文，不能包含文件属性。", name));
        if (id === 'catalog' && (mode !== 'append' || !rule.heading || !rule.template.startsWith('- ') || /[\r\n]/.test(rule.template) || !rule.template.includes('{{link}}') || /\{\{/.test(rule.pathTemplate))) throw new Error(t("集中清单规则须追加到固定路径，并使用含 {{link}} 的单行列表模板，以保留日记与作品关联。"));
        ids.add(id); rules.push(rule);
    }
    return rules;
}

export function rulePath(rule: WriteRule, values: ReturnType<typeof noteValues>): string {
    return episodeNotePath(rule.folder, rule.pathTemplate, values);
}

export async function ruleTemplate(podcast: CaptureService, rule: WriteRule): Promise<string> {
    let template = rule.template;
    if (rule.templateFile) {
        podcast.notes.checkPath(rule.templateFile);
        const file = podcast.app.vault.getAbstractFileByPath(rule.templateFile);
        if (!isMarkdownFile(file)) throw new Error(t("规则 {0}：模板不存在：{1}", rule.name, rule.templateFile));
        template = await podcast.app.vault.read(file);
    }
    validateNoteTemplate(template);
    if (rule.mode === 'append') {
        if (/^(?:\uFEFF)?---\r?\n/.test(template)) throw new Error(t("规则 {0}：追加模板不能包含文件属性。", rule.name));
        renderTemplateBody(template, {});
    }
    return template;
}
