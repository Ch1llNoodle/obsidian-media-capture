import { FuzzySuggestModal, Notice, type TFile } from 'obsidian';
import type { CaptureService } from './service';
import type { RecommendationSource } from './types';
import { CaptureModal } from './capture-modal';
import { entryIdentity, isListeningState, localDate, recordDate, stateOf } from './core';
import { isMarkdownFile } from './storage';
import { errorMessage } from './validation';

export class NoteTemplatePicker extends FuzzySuggestModal<TFile> {
    constructor(private readonly podcast: CaptureService, private readonly changed: () => void, private readonly select: (path: string) => Promise<void>) {
        super(podcast.app);
        this.setPlaceholder('选择内容模板');
    }
    getItems(): TFile[] { return this.podcast.app.vault.getMarkdownFiles(); }
    getItemText(file: TFile): string { return file.path; }
    onChooseItem(file: TFile): void {
        void this.select(file.path)
            .then(() => this.changed()).catch((error: unknown) => new Notice(errorMessage(error)));
    }
}

export async function openEpisodeNote(podcast: CaptureService, source: Pick<RecommendationSource, 'path' | 'blockId'>): Promise<void> {
    if (podcast.unloaded || !podcast.isCatalog(source.path)) throw new Error('请从媒体记录选择单集。');
    const existing = await podcast.notes.find(source.blockId);
    if (existing) { await podcast.app.workspace.getLeaf(false).openFile(existing); return; }
    const file = podcast.app.vault.getAbstractFileByPath(source.path);
    if (!isMarkdownFile(file)) throw new Error('找不到媒体记录文件。');
    const line = (await podcast.app.vault.read(file)).split(/\r?\n/).find(line => line.trimEnd().endsWith('^' + source.blockId));
    const identity = line ? entryIdentity(line) : null;
    if (!identity || !line) throw new Error('单集记录已变化，请重新选择。');
    const state = stateOf(line);
    new CaptureModal(podcast, { output: 'note', item: { ...identity, state: isListeningState(state) ? state : '想听',
        date: recordDate(line) || localDate(), cover: line.match(/!\[(?:cover)?\|\d+\]\(<([^>]+)>\)/)?.[1] ?? '' } }).open();
}
