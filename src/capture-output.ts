import type { PodcastService } from './service';
import type { CaptureItem, CaptureResult, CaptureUpdatedEvent } from './types';
import { blockId, entryIdentity, episodeUrl, findEntry, isListeningState, validDate } from './core';
import { isCaptureMode, splitEpisodeTitle } from './note-format';
import { isMarkdownFile } from './storage';
import { errorMessage } from './validation';
import { cacheCover } from './covers';
import { coverUrl } from './metadata-helpers';

export async function saveCapture(service: PodcastService, input: CaptureItem): Promise<CaptureResult> {
    const mode = input.repairOnly ? 'log' : input.output ?? service.config.captureMode;
    if (!isCaptureMode(mode)) throw new Error('请选择有效的保存方式。');
    if (mode === 'log') return service.captureLogOne(input);
    let item: CaptureItem = { ...input, ...episodeUrl(input.url) };
    if (service.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
    if (!item.title.trim() || !isListeningState(item.state)) throw new Error('名称或状态无效。');
    if (item.state === '听过' && !validDate(item.date)) throw new Error('收听日期无效。');
    if (item.published && !validDate(item.published)) throw new Error('发布日期无效。');
    const split = splitEpisodeTitle(item.title);
    item = { ...item, show: item.show ?? split.show, episodeTitle: item.episodeTitle ?? split.episodeTitle };
    const catalog = service.app.vault.getAbstractFileByPath(service.config.catalogPath);
    const previous = isMarkdownFile(catalog) ? findEntry(await service.app.vault.read(catalog), item) : undefined;
    const identity = previous ? entryIdentity(previous) : null;
    const id = identity ? blockId(identity) : blockId(item);
    const plan = await service.notes.prepare(item, id);
    let logged: CaptureResult | undefined;
    if (mode === 'both') logged = await service.captureLogOne(item);
    let coverPath = logged?.coverPath ?? previous?.match(/!\[(?:cover)?\|24\]\(<([^>]+)>\)/)?.[1] ?? '';
    let coverError = logged?.coverError ?? '';
    let coverSource = logged?.coverSource ?? '';
    if (!plan.existing && !logged && !coverPath && service.config.downloadCovers) {
        try {
            coverSource = coverUrl(item.cover);
            if (!coverSource) coverSource = (await service.fetchMetadata(item.url)).cover;
            if (!coverSource) throw new Error('页面未提供可识别的封面');
            coverPath = await cacheCover(service.app, coverSource, service.config.imageFolder, `podcast-${id}`);
        } catch (error) { coverError = errorMessage(error); }
    }
    let noteSaved = false;
    try {
        const result = await service.notes.save(plan, coverPath);
        noteSaved = true;
        if (logged || previous) {
            const file = service.app.vault.getAbstractFileByPath(service.config.catalogPath);
            if (isMarkdownFile(file)) await service.app.vault.process(file, text => attachEpisodeNote(text, id, result.file.path));
        } else if (service.config.dailyIntegration && item.state === '听过') {
            const diaries = service.app.vault.getMarkdownFiles().filter(file => file.path.startsWith(service.config.dailyFolder + '/') && file.basename === item.date);
            if (diaries.length === 1 && diaries[0]) {
                const label = Array.from(item.title).map(character => '\r\n|[]'.includes(character) ? ' ' : character).join('');
                const target = result.file.path.replace(/\.md$/i, '');
                const link = `[[${target}|${label}]]`;
                await service.app.fileManager.processFrontMatter(diaries[0], (data: Record<string, unknown>) => {
                    const current: unknown = data[service.config.dailyProperty];
                    const values: unknown[] = Array.isArray(current) ? current : current ? [current] : [];
                    if (!values.some(value => typeof value === 'string' && (value.startsWith(`[[${target}|`) || value === `[[${target}]]`))) data[service.config.dailyProperty] = [...values, link];
                });
            }
        }
        service.app.workspace.trigger('podcast-capture:updated', { path: logged || previous ? service.config.catalogPath : result.file.path,
            blockId: logged || previous ? id : '', state: item.state, date: item.date, notePath: result.file.path, output: mode } satisfies CaptureUpdatedEvent);
        return { hasCover: !!coverPath, coverPath, coverError, coverSource, notePath: result.file.path, noteCreated: result.created,
            message: (logged ? '清单已保存 · ' : '') + (result.created ? '已创建单集笔记' : '已找到已有单集笔记') + (coverError ? `（封面：${coverError}）` : '') };
    } catch (error) {
        throw new Error((noteSaved ? '单集笔记已保存，关联更新未完成：' : logged ? '清单已保存，单集笔记流程未完成：' : '') + errorMessage(error));
    }
}

export function attachEpisodeNote(text: string, id: string, path: string): string {
    if (['[', ']', '|', '#', '\n', '\r'].some(character => path.includes(character))) throw new Error('笔记路径不支持内部链接。');
    const lines = text.split(/\r?\n/);
    const index = lines.findIndex(line => line.startsWith('- ') && line.trimEnd().endsWith('^' + id));
    if (index < 0) return text;
    let line = (lines[index] ?? '').trimEnd();
    line = line.replace(/\s*<!-- podcast-note -->\s*\[\[[^\]]+\]\]/, '');
    const marker = `<!-- podcast-note --> [[${path.replace(/\.md$/i, '')}|笔记]]`;
    lines[index] = line.replace(/\s+(\^\S+)$/, (_match: string, block: string) => ` ${marker} ${block}`);
    return lines.join('\n');
}
