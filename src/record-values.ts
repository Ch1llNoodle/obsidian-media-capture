import { parseYaml } from 'obsidian';
import { entryIdentity, episodeUrl, isListeningState, recordDate, stateOf, validDate } from './core';
import { noteValues, splitEpisodeTitle, type NoteValues } from './note-format';
import { mediaValues } from './media';
import { record } from './validation';

export function properties(text: string): Record<string, unknown> {
    const header = /^---\r?\n((?:[\s\S]*?\r?\n)?)---(?:\r?\n|$)/.exec(text)?.[1];
    return header === undefined ? {} : record(parseYaml(header));
}
function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function date(value: unknown): string {
    const string = value instanceof Date ? value.toISOString().slice(0, 10) : text(value).slice(0, 10);
    return validDate(string) ? string : '';
}

/** Restore metadata from 0.6.0 notes without inferring handwritten paragraphs as episode descriptions. */
export function legacyValues(source: string, id: string, log: string, saved: NoteValues = {}): NoteValues {
    const props = properties(source);
    const line = log.split(/\r?\n/).find(line => line.trimEnd().endsWith('^' + id));
    const entry = line ? entryIdentity(line) : null;
    let url = text(props.url) || saved.url || entry?.url || '';
    if (!url) {
        try { url = episodeUrl(source).url; } catch { /* Report the missing canonical URL below. */ }
    }
    if (!url) throw new Error('缺少单集链接。旧笔记需保留平台单集链接，或在 url 属性中填写链接。');
    const episode = episodeUrl(url);
    const split = splitEpisodeTitle(entry?.title || '');
    const heading = source.match(/^#{1,6}\s+(.+)$/m)?.[1]?.replace(/\\(.)/g, (match: string, character: string) => '[]*_`\\'.includes(character) ? character : match) ?? '';
    const title = text(props.episodeTitle) || text(props.title) || saved.title || split.episodeTitle || heading;
    if (!title.trim()) throw new Error('缺少单集标题。请在 title 属性或正文标题中补充名称。');
    const listened = date(props.listened) || saved.listened || (line ? recordDate(line) : '');
    const state = text(props.state) || saved.state || (line ? stateOf(line) : '') || (listened ? '听过' : '');
    const coverPath = text(props.coverPath) || saved.coverpath || source.match(/!\[[^\]]*\]\(<([^>]+)>\)/)?.[1] || '';
    const created = date(props.currentDate) || date(props.date) || saved.currentdate || '';
    const show = text(props.show) || saved.show || split.show;
    const fulltitle = show ? show + ' · ' + title : title;
    return { ...mediaValues({ url: episode.url, state: isListeningState(state) ? state : '在听', date: listened }), id, url: episode.url, title, show, fulltitle,
        link: noteValues({ ...episode, title: fulltitle, state: isListeningState(state) ? state : '在听', date: listened }, id, coverPath, created).link ?? '',
        published: date(props.published) || saved.published || '', listened: isListeningState(state) && state !== '听过' ? '' : listened,
        currentdate: created, date: created, description: text(props.description) || saved.description || '', state, provider: episode.provider,
        coverpath: coverPath, cover: coverPath ? `![|120](<${coverPath}>)` : '' };
}
