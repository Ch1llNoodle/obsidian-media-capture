import { parseYaml, stringifyYaml } from 'obsidian';
import type { CaptureItem, CapturePreset } from './types';
import { mediaValues } from './media';
import { isRecord } from './validation';

export const DEFAULT_NOTE_TEMPLATE = '### {{title}}\n\n{{show}}\n\n{{cover}}\n\n[打开来源](<{{url}}>)\n\n{{mediaLink}}\n\n#### Notes\n\n\n#### Quotes\n';
export const capturePresets: Record<CapturePreset, string> = { custom: '使用已启用规则', log: '预设：集中清单', note: '预设：每条一篇', both: '预设：清单与独立笔记', show: '预设：按节目／频道追加' };
export function isCapturePreset(value: unknown): value is CapturePreset { return typeof value === 'string' && Object.keys(capturePresets).includes(value); }

export function relativeNotePath(value: string, allowEmpty = false): string {
    const path = value.trim().replace(/\\/g, '/');
    if (!path && allowEmpty) return '';
    const protectedFolders = ['.git', '.codex', '.agents', '.aws'];
    if (!path || /[:<>\r\n"|?*#]/.test(path) || path.includes('[') || path.includes(']') || path.startsWith('/') || path.split('/').some(part => !part || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part) || protectedFolders.includes(part.toLowerCase()))) {
        throw new Error('笔记路径必须位于库内，不能包含 ..、空目录或配置目录。');
    }
    return path;
}

const variables = new Set(['show', 'title', 'fulltitle', 'link', 'url', 'cover', 'coverpath', 'published', 'listened', 'currentdate', 'date', 'description', 'state', 'provider', 'id', 'mediaurl', 'medialink', 'consumed', 'kind']);
const pathVariables = new Set(['show', 'title', 'published', 'listened', 'currentdate', 'date', 'provider', 'id', 'consumed', 'kind']);
export function validateNoteTemplate(template: string, path = false): void {
    if (/\{\{|\}\}/.test(template.replace(/\{\{[^{}]+\}\}/g, ''))) throw new Error('模板变量的双花括号不完整。');
    for (const match of template.matchAll(/\{\{([^{}]+)\}\}/g)) {
        const [key = '', format] = (match[1] ?? '').trim().split(':');
        if (!(path ? pathVariables : variables).has(key.toLowerCase())) throw new Error(`未知笔记模板变量：${match[0]}`);
        if ((match[1] ?? '').split(':').length > 2 || format !== undefined && (!['published', 'listened', 'currentdate', 'date'].includes(key.toLowerCase()) || !/^(?:YYYY|MM|DD|[-_. /])+$/.test(format))) {
            throw new Error(`不支持的日期格式：${match[0]}，可用 YYYY、MM、DD。`);
        }
    }
}

export function splitEpisodeTitle(title: string): { show: string; episodeTitle: string } {
    const index = title.indexOf(' · ');
    return index > 0 ? { show: title.slice(0, index).trim(), episodeTitle: title.slice(index + 3).trim() }
        : { show: '', episodeTitle: title.trim() };
}

function safeName(value: string): string {
    const invalid = '<>:"/\\|?*#[]';
    let name = Array.from(value.normalize('NFKC')).map(character => character.charCodeAt(0) < 32 || invalid.includes(character) ? ' ' : character)
        .join('').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
    if (/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name)) name = '_' + name;
    return Array.from(name || 'Untitled').slice(0, 120).join('').replace(/[. ]+$/, '') || 'Untitled';
}

export type NoteValues = Record<string, string>;
export function noteValues(item: CaptureItem, id: string, coverPath: string, currentDate: string, playback = false): NoteValues {
    if (!item.provider) throw new Error('Missing canonical provider.');
    const split = splitEpisodeTitle(item.title);
    return { ...mediaValues(item, playback), show: (item.show ?? split.show).replace(/\s+/g, ' ').trim(), title: (item.episodeTitle ?? split.episodeTitle).replace(/\s+/g, ' ').trim(), fulltitle: item.title,
        link: `[${markdown(item.title)}](<${item.url}>)`, url: item.url,
        cover: coverPath ? `![|120](<${coverPath}>)` : '', coverpath: coverPath, published: item.published ?? '',
        listened: item.state === '听过' ? item.date : '', currentdate: currentDate, date: currentDate,
        description: item.description ?? '', state: item.state, provider: item.provider, id };
}

function valueOf(token: string, values: NoteValues): string {
    const [key = '', format] = token.trim().split(':');
    const value = values[key.toLowerCase()] ?? '';
    if (format === undefined || !value) return value;
    const [year = '', month = '', day = ''] = value.split('-');
    return format.replace(/YYYY|MM|DD/g, tag => ({ YYYY: year, MM: month, DD: day })[tag] ?? '');
}

export function episodeNotePath(folder: string, pathTemplate: string, values: NoteValues): string {
    validateNoteTemplate(pathTemplate, true);
    const rendered = pathTemplate.replace(/\{\{([^{}]+)\}\}/g, (_match: string, token: string) => {
        const value = valueOf(token, values);
        return safeName(value || (token.trim().toLowerCase() === 'show' ? 'Unsorted' : 'Untitled'));
    });
    const result = relativeNotePath([folder, rendered].filter(Boolean).join('/'));
    if (!result.toLowerCase().endsWith('.md')) throw new Error('生成的笔记路径不是 Markdown 文件。');
    return result;
}

function markdown(value: string): string {
    return Array.from(value).map(character => '\\[]*_`'.includes(character) ? '\\' + character : character).join('').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function renderTemplateBody(template: string, values: NoteValues): string {
    validateNoteTemplate(template);
    return template.replace(/\{\{([^{}]+)\}\}/g, (_match: string, token: string) => {
        const value = valueOf(token, values);
        return ['url', 'cover', 'link', 'mediaurl', 'medialink'].includes(token.trim().toLowerCase()) ? value : markdown(value);
    });
}

export function withCoverWidth(values: NoteValues, width: number): NoteValues {
    return { ...values, cover: values.coverpath ? `![|${width}](<${values.coverpath}>)` : '' };
}

/** Template YAML is parsed before inserting data, so quotes/newlines cannot create new properties. */
export function renderEpisodeNote(template: string, values: NoteValues, ruleId = 'notes'): string {
    template = template.replace(/^\uFEFF/, '');
    validateNoteTemplate(template);
    const frontmatter = /^---\r?\n((?:[\s\S]*?\r?\n)?)---(?:\r?\n|$)/.exec(template);
    if (/^---\r?\n/.test(template) && !frontmatter) throw new Error('模板的笔记属性缺少结束分隔符。');
    let properties: Record<string, unknown> = {};
    let body = template;
    if (frontmatter) {
        const slots = new Map<string, string>();
        const header = (frontmatter[1] ?? '').replace(/\{\{([^{}]+)\}\}/g, (_match: string, token: string) => {
            const key = `PODCAST_CAPTURE_SLOT_${slots.size}_END`;
            slots.set(key, valueOf(token, values));
            return key;
        });
        const parsed: unknown = parseYaml(header);
        if (parsed != null && !isRecord(parsed)) throw new Error('模板的笔记属性必须是 YAML 映射。');
        const seen = new Set<object>();
        const replace = (value: unknown, depth = 0): unknown => {
            if (depth > 20) throw new Error('模板的笔记属性嵌套过深。');
            if (typeof value === 'string') {
                return value.replace(/PODCAST_CAPTURE_SLOT_\d+_END/g, key => slots.get(key) ?? key);
            }
            if (value && typeof value === 'object') {
                if (seen.has(value)) throw new Error('模板的笔记属性不能包含循环引用。');
                seen.add(value);
                const result: unknown = Array.isArray(value) ? value.map((item: unknown) => replace(item, depth + 1))
                    : value instanceof Date ? value : Object.fromEntries(Object.entries(value).map(([key, item]) => {
                        if (/PODCAST_CAPTURE_SLOT_\d+_END/.test(key)) throw new Error('模板变量只能用于属性值，不能用于属性名。');
                        return [key, replace(item, depth + 1)];
                    }));
                seen.delete(value);
                return result;
            }
            return value;
        };
        const replaced = replace(parsed ?? {});
        properties = isRecord(replaced) ? replaced : {};
        body = template.slice(frontmatter[0].length);
    }
    properties.podcast_capture_id = values.id;
    properties.podcast_capture_rule = ruleId;
    const content = renderTemplateBody(body, values);
    return `---\n${stringifyYaml(properties).trimEnd()}\n---\n\n${content.trim()}\n`;
}

export function noteProperties(source: string): Record<string, unknown> {
    const header = /^---\r?\n((?:[\s\S]*?\r?\n)?)---(?:\r?\n|$)/.exec(source)?.[1];
    if (header === undefined) return {};
    const parsed: unknown = parseYaml(header);
    if (parsed == null) return {};
    if (!isRecord(parsed)) throw new Error('Note properties must be a YAML mapping.');
    return parsed;
}
