import { moment, normalizePath, type App, type TFile } from 'obsidian';
import { ensureFolder, isMarkdownFile } from './storage';
import { record } from './validation';
import { vaultPath } from './settings';
import { t } from './i18n';

/** Daily-note paths and templates belong to the core Daily notes configuration. */
export async function taskDailyNote(app: App): Promise<{ file: TFile; folder: string }> {
    const adapter = app.vault.adapter;
    const config = normalizePath(`${app.vault.configDir}/daily-notes.json`);
    if (!await adapter.exists(config)) throw new Error(t('请先配置 Obsidian 的日记功能。'));
    const options = record(JSON.parse(await adapter.read(config)) as unknown);
    const folder = typeof options.folder === 'string' && options.folder.trim() ? vaultPath(options.folder) : '';
    const date = moment();
    const format = typeof options.format === 'string' && options.format.trim() ? options.format : 'YYYY-MM-DD';
    const path = vaultPath([folder, `${date.format(format)}.md`].filter(Boolean).join('/'), '.md');
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing) {
        if (!isMarkdownFile(existing)) throw new Error(t('目标不是 Markdown 文件：{0}', path));
        return { file: existing, folder };
    }
    let content = '';
    if (typeof options.template === 'string' && options.template.trim()) {
        const templatePath = vaultPath(options.template.endsWith('.md') ? options.template : `${options.template}.md`, '.md');
        const template = app.vault.getAbstractFileByPath(templatePath);
        if (!isMarkdownFile(template)) throw new Error(t('日记模板不存在：{0}', templatePath));
        content = await app.vault.read(template);
        content = content.replace(/\{\{(date|time)(?::([^}]+))?\}\}/g, (_match, kind: string, custom: string | undefined) =>
            date.format(custom || (kind === 'date' ? 'YYYY-MM-DD' : 'HH:mm')));
        content = content.replace(/\{\{title\}\}/g, path.split('/').at(-1)!.slice(0, -3));
    }
    const parent = path.slice(0, path.lastIndexOf('/'));
    if (path.includes('/')) await ensureFolder(app.vault, parent);
    try { return { file: await app.vault.create(path, content), folder }; }
    catch (error) {
        const created = app.vault.getAbstractFileByPath(path);
        if (isMarkdownFile(created)) return { file: created, folder };
        throw error;
    }
}
