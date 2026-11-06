import type { PodcastService } from './service';
import type { CaptureItem, CaptureResult, CaptureUpdatedEvent, WriteRule } from './types';
import type { EpisodeNotePlan } from './episode-notes';
import type { AppendPlan } from './append-output';
import { blockId, entryIdentity, episodeUrl, findEntry, isListeningState, localDate, recordDate, stateOf, updateCatalog, validDate } from './core';
import { isCaptureMode, noteValues, splitEpisodeTitle } from './note-format';
import { presetRules, rulesFor, ruleTemplate } from './write-rules';
import { isMarkdownFile } from './storage';
import { errorMessage } from './validation';
import { captureCover, dailyNotes, writeDailyLink } from './capture-context';

type Plan = { kind: 'catalog'; rule: WriteRule; path: string } | { kind: 'create'; rule: WriteRule; path: string; plan: EpisodeNotePlan } | { kind: 'append'; rule: WriteRule; path: string; plan: AppendPlan };

export async function saveCapture(service: PodcastService, input: CaptureItem): Promise<CaptureResult> {
    const mode = input.repairOnly ? 'log' : input.output ?? service.config.captureMode;
    if (!isCaptureMode(mode)) throw new Error('请选择有效的写入预设。');
    const rules = rulesFor(service.config, mode);
    if (!rules.length) throw new Error('没有启用的写入规则，请在设置中启用至少一条。');
    const item: CaptureItem = { ...input, ...episodeUrl(input.url) };
    if (service.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
    if (!item.title.trim() || !isListeningState(item.state)) throw new Error('名称或状态无效。');
    if (item.state === '听过' && !validDate(item.date)) throw new Error('收听日期无效。');
    if (item.published && !validDate(item.published)) throw new Error('发布日期无效。');
    const split = splitEpisodeTitle(item.title);
    item.show ??= split.show; item.episodeTitle ??= split.episodeTitle;
    const catalog = service.app.vault.getAbstractFileByPath(service.config.catalogPath) ?? null;
    const source = isMarkdownFile(catalog) ? await service.app.vault.read(catalog) : '';
    const previous = findEntry(source, item);
    const identity = previous ? entryIdentity(previous) : null;
    const id = identity ? blockId(identity) : service.notes.matchId(item) ?? blockId(item);
    const createdDate = service.notes.values(id)?.currentdate || localDate();
    const diaries = dailyNotes(service, item);
    const completed = stateOf(previous) === '听过';
    const oldDate = recordDate(previous);
    const storedValues = service.notes.values(id);
    const recordItem = completed || storedValues?.state === '听过'
        ? { ...item, state: '听过' as const, date: oldDate || storedValues?.listened || item.date } : item;
    if (rules.some(rule => rule.id === 'catalog') && item.state === '听过' && completed && oldDate !== item.date && diaries.length !== 1) throw new Error(`已在 ${oldDate || '之前'} 记录过这一集。记录重听需要开启日记联动，并先准备 ${item.date} 的日记。`);

    // Prepare every destination before writing any of them.
    const plans: Plan[] = [];
    const destinations = new Set<string>();
    const templates = [...(service.config.writeRules ?? presetRules(service.config)), ...rules].map(rule => rule.templateFile.toLowerCase()).filter(Boolean);
    for (const rule of rules) {
        try {
            let plan: Plan;
            if (rule.id === 'catalog') {
                service.notes.checkPath(service.config.catalogPath, true);
                const template = await ruleTemplate(service, rule);
                if (!template.startsWith('- ') || /[\r\n]/.test(template) || !template.includes('{{link}}')) throw new Error('集中清单需要含 {{link}} 的单行列表模板。');
                rule.template = template;
                if (source) updateCatalog(source, recordItem, '', { ...service.config, writeRules: [rule] }, createdDate);
                plan = { kind: 'catalog', rule, path: service.config.catalogPath };
            } else if (rule.mode === 'create') {
                const prepared = await service.notes.prepare(recordItem, id, rule);
                plan = { kind: 'create', rule, path: prepared.path, plan: prepared };
            } else {
                const prepared = await service.appends.prepare(rule, recordItem, id);
                plan = { kind: 'append', rule, path: prepared.path, plan: prepared };
            }
            if (destinations.has(plan.path.toLowerCase())) throw new Error('多条规则指向同一个文件，请合并规则或调整路径。');
            if (templates.includes(plan.path.toLowerCase())) throw new Error('写入目标是当前内容模板，请调整路径。');
            destinations.add(plan.path.toLowerCase()); plans.push(plan);
        } catch (error) { throw new Error(`规则「${rule.name}」准备失败：${errorMessage(error)}。未开始写入。`); }
    }
    const oldCover = previous?.match(/!\[(?:cover)?\|\d+\]\(<([^>]+)>\)/)?.[1] ?? service.notes.values(id)?.coverpath ?? '';
    const needed = plans.some(plan => plan.kind !== 'create' || !plan.plan.existing);
    const cover = await captureCover(service, item, id, oldCover, needed);
    if (recordItem.title !== item.title) {
        const corrected = splitEpisodeTitle(item.title);
        recordItem.title = item.title; recordItem.show = corrected.show; recordItem.episodeTitle = corrected.episodeTitle;
    }
    const saved: { path: string; anchor: string; kind: Plan['kind']; created: boolean; name: string }[] = [];
    let stage = '写入目标';
    try {
        for (const plan of plans) {
            stage = `写入规则「${plan.rule.name}」：${plan.path}`;
            if (service.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
            if (plan.kind === 'catalog') {
                const file = await service.ensureCatalog();
                await service.app.vault.process(file, text => updateCatalog(text, recordItem, cover.path, { ...service.config, writeRules: [plan.rule] }, createdDate).text);
                saved.push({ path: file.path, anchor: id, kind: plan.kind, created: !previous, name: plan.rule.name });
            } else if (plan.kind === 'create') {
                const result = await service.notes.save(plan.plan, cover.path);
                saved.push({ path: result.file.path, anchor: '', kind: plan.kind, created: result.created, name: plan.rule.name });
            } else {
                const result = await service.appends.save(plan.plan, cover.path);
                saved.push({ ...result, kind: plan.kind, name: plan.rule.name });
            }
        }
        const logged = saved.find(result => result.kind === 'catalog');
        const note = saved.find(result => result.kind !== 'catalog');
        if (note && (logged || previous)) {
            stage = '更新清单中的笔记链接';
            const file = service.app.vault.getAbstractFileByPath(service.config.catalogPath) ?? null;
            if (isMarkdownFile(file)) await service.app.vault.process(file, text => attachEpisodeNote(text, id, note.path, note.anchor));
        }
        const target = logged ?? (!previous ? note : undefined);
        if (target) {
            stage = '日记写入';
            await writeDailyLink(service, item, diaries, target.path, target.anchor);
        }
        // One captured metadata record serves all output rules.
        const stored = service.notes.values(id);
        if (!stored || rules.some(rule => rule.mode === 'append')) {
            stage = '保存单集信息';
            const state = stored?.state === '听过' ? '听过' : item.state;
            const date = stored?.state === '听过' && stored.listened ? stored.listened : completed && oldDate ? oldDate : item.date;
            const values = noteValues({ ...item, state, date }, id, cover.path, stored?.currentdate || localDate());
            await service.notes.remember(id, { ...values, description: values.description || stored?.description || '', published: values.published || stored?.published || '' });
        }
        const primary = logged ?? note;
        if (!primary) throw new Error('没有成功写入的目标。');
        service.app.workspace.trigger('podcast-capture:updated', { path: primary.path, blockId: logged || previous ? id : '', state: item.state,
            date: item.date, ...(note ? { notePath: note.path, output: mode } : {}) } satisfies CaptureUpdatedEvent);
        return { hasCover: !!cover.path, coverPath: cover.path, coverError: cover.error, coverSource: cover.source,
            ...(note ? { notePath: note.path, noteCreated: note.created } : {}),
            message: (note ? saved.map(result => result.kind === 'catalog' ? '清单已保存' : result.created ? `已保存到${result.name}` : `已找到已有${result.name}`).join(' · ')
                : completed ? '已保留原记录' : '已添加到播客记录') + (item.state === '听过' ? ` · ${item.date}` : ` · ${item.state}`) + (cover.error ? `（封面未获取到：${cover.error}）` : '') };
    } catch (error) {
        const prefix = saved.some(result => result.kind !== 'catalog') ? '单集笔记已保存，' : saved.some(result => result.kind === 'catalog') ? '清单已保存，' : '';
        const detail = saved.length ? '\n已保存：' + saved.map(result => result.name + ' → ' + result.path).join('；') + '。再次保存可复用。' : '';
        throw new Error(`${prefix}${stage}失败：${errorMessage(error)}${detail}`);
    }
}

export function attachEpisodeNote(text: string, id: string, path: string, anchor = ''): string {
    if (['[', ']', '|', '#', '\n', '\r'].some(character => path.includes(character)) || anchor && !/^[a-z0-9-]+$/.test(anchor)) throw new Error('笔记路径不支持内部链接。');
    const lines = text.split(/\r?\n/);
    const index = lines.findIndex(line => line.startsWith('- ') && line.trimEnd().endsWith('^' + id));
    if (index < 0) return text;
    const line = (lines[index] ?? '').trimEnd().replace(/\s*<!-- podcast-note -->\s*\[\[[^\]]+\]\]/, '');
    const target = path.replace(/\.md$/i, '') + (anchor ? '#^' + anchor : '');
    lines[index] = line.replace(/\s+(\^\S+)$/, (_match: string, block: string) => ` <!-- podcast-note --> [[${target}|笔记]] ${block}`);
    return lines.join('\n');
}
