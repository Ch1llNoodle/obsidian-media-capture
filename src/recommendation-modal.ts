import { Modal, Notice } from 'obsidian';
import type { RecommendationItem, RecommendationKind, RecommendationSource } from './types';
import type { RecommendationService } from './recommendation-service';
import { fetchRecommendation, searchRecommendations } from './recommendation-metadata';
import { recommendationKinds, recommendationNames, recommendationSearchUrl, recommendationUrl } from './recommendations';
import { errorMessage } from './validation';

export class RecommendationModal extends Modal {
    private sources: RecommendationSource[] = [];
    private busy = false;
    private item: RecommendationItem | null = null;
    private sourceInput!: HTMLSelectElement;
    private kindInput!: HTMLSelectElement;
    private queryInput!: HTMLInputElement;
    private titleInput!: HTMLInputElement;
    private reasonInput!: HTMLInputElement;
    private results!: HTMLDivElement;
    private message!: HTMLParagraphElement;

    constructor(private readonly service: RecommendationService, private readonly selected?: Pick<RecommendationSource, 'path' | 'blockId'>) {
        super(service.podcast.app);
    }

    override onOpen(): void {
        this.contentEl.addClass('podcast-capture');
        this.contentEl.createEl('h2', { text: '添加推荐作品' });
        const field = (name: string) => {
            const label = this.contentEl.createEl('label', { cls: 'podcast-capture-field' });
            label.createSpan({ text: name });
            return label;
        };
        this.sourceInput = field('来自哪期播客').createEl('select');
        this.kindInput = field('作品类型').createEl('select');
        for (const kind of recommendationKinds) this.kindInput.createEl('option', { value: kind, text: recommendationNames[kind] });
        this.kindInput.value = 'movie';
        this.queryInput = field('作品名称或豆瓣详情链接').createEl('input', { type: 'text' });
        this.queryInput.addEventListener('input', () => { this.item = null; this.titleInput.value = ''; this.results.empty(); });
        this.kindInput.addEventListener('change', () => { this.item = null; this.results.empty(); });
        const actions = this.contentEl.createDiv({ cls: 'podcast-capture-actions' });
        const search = actions.createEl('button', { text: '搜索或解析' });
        search.addEventListener('click', () => { void this.run(() => this.search()); });
        const external = actions.createEl('button', { text: '打开豆瓣搜索' });
        external.addEventListener('click', () => {
            try { window.open(recommendationSearchUrl(this.queryInput.value), '_blank', 'noopener'); }
            catch (error) { this.message.setText(errorMessage(error)); }
        });
        this.results = this.contentEl.createDiv({ cls: 'podcast-recommend-results' });
        this.titleInput = field('作品名称（可手动填写）').createEl('input', { type: 'text' });
        this.reasonInput = field('推荐理由（可留空）').createEl('input', { type: 'text' });
        this.message = this.contentEl.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } });
        const footer = this.contentEl.createDiv({ cls: 'podcast-capture-actions' });
        footer.createEl('button', { text: '取消' }).addEventListener('click', () => this.close());
        footer.createEl('button', { text: '加入清单', cls: 'mod-cta' }).addEventListener('click', () => { void this.run(() => this.save()); });
        void this.run(async () => {
            this.sources = await this.service.sources();
            for (const source of this.sources) this.sourceInput.createEl('option', { value: source.blockId, text: source.title });
            if (this.selected?.path === this.service.podcast.config.catalogPath) this.sourceInput.value = this.selected.blockId;
            if (!this.sources.length) this.message.setText('请先添加一期播客，再关联推荐作品。');
        });
    }

    private kind(): RecommendationKind {
        return recommendationKinds.find(kind => kind === this.kindInput.value) ?? 'movie';
    }

    private async search(): Promise<void> {
        this.results.empty();
        if (/https?:\/\//i.test(this.queryInput.value)) {
            await this.loadItem(this.queryInput.value);
            return;
        }
        const items = await searchRecommendations(this.queryInput.value, this.kind());
        for (const item of items) {
            const button = this.results.createEl('button', { text: item.title });
            button.addEventListener('click', () => { void this.run(async () => {
                this.queryInput.value = item.url;
                this.titleInput.value = item.title;
                await this.loadItem(item.url);
            }); });
        }
        this.message.setText('选择作品，确认名称后加入清单。');
    }

    private async loadItem(url: string): Promise<void> {
        this.item = await fetchRecommendation(url, this.kind());
        this.queryInput.value = this.item.url;
        this.titleInput.value = this.item.title;
        this.kindInput.value = this.item.kind;
        this.message.setText(this.item.cover ? '已取得名称和封面。' : '已取得名称，暂未找到封面。');
    }

    private async save(): Promise<void> {
        const source = this.sources.find(source => source.blockId === this.sourceInput.value);
        if (!source) throw new Error('请选择来源播客。');
        const identity = recommendationUrl(this.queryInput.value, this.kind());
        const title = this.titleInput.value.trim();
        if (!title) throw new Error('请先解析作品，或手动填写名称。');
        const item: RecommendationItem = { ...identity, title, cover: this.item?.url === identity.url ? this.item.cover : '' };
        const result = await this.service.add(item, source, this.reasonInput.value);
        new Notice(`${result.created ? '已加入清单' : '已关联播客来源'}${result.coverError ? `（封面未下载：${result.coverError}）` : ''}`);
        this.close();
    }

    private async run(action: () => Promise<void>): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        this.message.setText('处理中…');
        this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button').forEach(node => { node.disabled = true; });
        try { await action(); }
        catch (error) { this.message.setText(errorMessage(error)); }
        finally {
            this.busy = false;
            this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button').forEach(node => { node.disabled = false; });
        }
    }

    override onClose(): void { this.contentEl.empty(); }
}
