import { Modal, Notice } from 'obsidian';
import type { RecommendationSource, RecommendationWork } from './types';
import type { RecommendationService } from './recommendation-service';
import { recommendationNames } from './recommendations';
import { errorMessage } from './validation';

export class RecommendationModal extends Modal {
    private sources: RecommendationSource[] = [];
    private works: RecommendationWork[] = [];
    private busy = false;
    private closed = false;
    private sourceInput!: HTMLSelectElement;
    private workInput!: HTMLSelectElement;
    private workSearch!: HTMLInputElement;
    private sourceSearch!: HTMLInputElement;
    private reasonInput!: HTMLInputElement;
    private message!: HTMLParagraphElement;

    constructor(private readonly service: RecommendationService,
        private readonly selected?: Pick<RecommendationSource, 'path' | 'blockId'>,
        private readonly selectedWork?: Pick<RecommendationWork, 'path' | 'url'>) {
        super(service.podcast.app);
    }

    override onOpen(): void {
        this.closed = false;
        this.contentEl.addClass('podcast-capture');
        this.contentEl.createEl('h2', { text: '关联作品与播客' });
        const field = (name: string) => {
            const label = this.contentEl.createEl('label', { cls: 'podcast-capture-field' });
            label.createSpan({ text: name });
            return label;
        };
        this.workSearch = field('搜索本地作品').createEl('input', { type: 'search' });
        this.workInput = field('作品').createEl('select');
        this.sourceSearch = field('搜索已记录的播客').createEl('input', { type: 'search' });
        this.sourceInput = field('来源播客').createEl('select');
        this.workSearch.addEventListener('input', () => this.filterWorks());
        this.sourceSearch.addEventListener('input', () => this.filterSources());
        this.reasonInput = field('摘记（可留空）').createEl('input', { type: 'text' });
        this.message = this.contentEl.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } });
        const footer = this.contentEl.createDiv({ cls: 'podcast-capture-actions' });
        footer.createEl('button', { text: '取消' }).addEventListener('click', () => this.close());
        footer.createEl('button', { text: '保存关联', cls: 'mod-cta' }).addEventListener('click', () => { void this.run(() => this.save()); });
        void this.run(async () => {
            [this.works, this.sources] = await Promise.all([this.service.works(), this.service.sources()]);
            if (this.closed) return;
            this.filterWorks();
            this.filterSources();
            const index = this.works.findIndex(work => work.path === this.selectedWork?.path && work.url === this.selectedWork.url);
            if (index >= 0) this.workInput.value = String(index);
            if (this.selected?.path === this.service.podcast.config.catalogPath) this.sourceInput.value = this.selected.blockId;
            this.message.setText(!this.works.length ? '本地清单中还没有作品，请先从豆瓣同步或导入。'
                : !this.sources.length ? '请先记录来源播客。' : '');
        });
    }

    private filterWorks(): void {
        const previous = this.workInput.value;
        const query = this.workSearch.value.trim().toLocaleLowerCase();
        this.workInput.empty();
        this.workInput.createEl('option', { value: '', text: '选择作品' });
        this.works.forEach((work, index) => {
            const label = recommendationNames[work.kind] + ' · ' + work.title + (work.state ? ' · ' + work.state : '');
            if (label.toLocaleLowerCase().includes(query)) this.workInput.createEl('option', { value: String(index), text: label });
        });
        this.workInput.value = previous;
    }

    private filterSources(): void {
        const previous = this.sourceInput.value;
        const query = this.sourceSearch.value.trim().toLocaleLowerCase();
        this.sourceInput.empty();
        this.sourceInput.createEl('option', { value: '', text: '选择播客' });
        for (const source of this.sources) {
            if (source.title.toLocaleLowerCase().includes(query)) this.sourceInput.createEl('option', { value: source.blockId, text: source.title });
        }
        this.sourceInput.value = previous;
    }

    private async save(): Promise<void> {
        const item = this.workInput.value === '' ? undefined : this.works[Number(this.workInput.value)];
        const source = this.sources.find(source => source.blockId === this.sourceInput.value);
        if (!item) throw new Error('请选择本地作品。');
        if (!source) throw new Error('请选择来源播客。');
        await this.service.link(item, source, this.reasonInput.value);
        if (this.closed) return;
        new Notice('已关联来源播客');
        this.close();
    }

    private async run(action: () => Promise<void>): Promise<void> {
        if (this.busy || this.closed) return;
        this.busy = true;
        this.message.setText('处理中。');
        const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button'));
        controls.forEach(node => { node.disabled = true; });
        try { await action(); }
        catch (error) { if (!this.closed) this.message.setText(errorMessage(error)); }
        finally { this.busy = false; if (!this.closed) controls.forEach(node => { node.disabled = false; }); }
    }

    override onClose(): void { this.closed = true; this.contentEl.empty(); }
}
