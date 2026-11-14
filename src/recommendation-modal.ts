import { t } from './i18n';
import { Modal, Notice } from 'obsidian';
import type { RecommendationSource, RecommendationWork } from './types';
import type { RecommendationService } from './recommendation-service';
import { recommendationNames } from './recommendations';
import { errorMessage } from './validation';

export class RecommendationModal extends Modal {
    private source: RecommendationSource | undefined;
    private works: RecommendationWork[] = [];
    private busy = false;
    private closed = false;
    private workInput!: HTMLSelectElement;
    private reasonInput!: HTMLInputElement;
    private message!: HTMLParagraphElement;

    constructor(private readonly service: RecommendationService,
        private readonly selected: Pick<RecommendationSource, 'path' | 'blockId'>) {
        super(service.podcast.app);
    }

    override onOpen(): void {
        this.closed = false;
        this.contentEl.addClass('media-capture');
        this.contentEl.createEl('h2', { text: t("添加关联") });
        const sourceLabel = this.contentEl.createEl('p');
        const field = (name: string) => {
            const label = this.contentEl.createEl('label', { cls: 'media-capture-field' });
            label.createSpan({ text: name });
            return label;
        };
        this.workInput = field(t("选择作品")).createEl('select');
        this.workInput.createEl('option', { value: '', text: t("选择作品") });
        this.reasonInput = field(t("摘记（可留空）")).createEl('input', { type: 'text' });
        this.message = this.contentEl.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } });
        const footer = this.contentEl.createDiv({ cls: 'media-capture-actions' });
        footer.createEl('button', { text: t("取消") }).addEventListener('click', () => this.close());
        footer.createEl('button', { text: t("保存关联"), cls: 'mod-cta' }).addEventListener('click', () => { void this.run(() => this.save()); });
        void this.run(async () => {
            const [works, sources] = await Promise.all([this.service.works(), this.service.sources()]);
            if (this.closed) return;
            this.source = sources.find(source => source.path === this.selected.path && source.blockId === this.selected.blockId);
            if (!this.source) throw new Error(t("来源播客已变化，请从媒体条目重新打开。"));
            sourceLabel.setText(this.source.title);
            this.works = works;
            this.works.forEach((work, index) => {
                this.workInput.createEl('option', { value: String(index), text: t(recommendationNames[work.kind]) + ' · ' + work.title });
            });
            this.workInput.value = '';
            this.message.setText(this.works.length ? '' : t("暂无待关联作品。"));
        });
    }

    private async save(): Promise<void> {
        const item = this.workInput.value === '' ? undefined : this.works[Number(this.workInput.value)];
        if (!item) throw new Error(t("请选择作品。"));
        if (!this.source) throw new Error(t("来源播客已变化，请从媒体条目重新打开。"));
        await this.service.link(item, this.source, this.reasonInput.value);
        if (this.closed) return;
        new Notice(t("已保存关联"));
        this.close();
    }

    private async run(action: () => Promise<void>): Promise<void> {
        if (this.busy || this.closed) return;
        this.busy = true;
        this.message.setText(t("处理中。"));
        const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button'));
        controls.forEach(node => { node.disabled = true; });
        try { await action(); }
        catch (error) { if (!this.closed) this.message.setText(errorMessage(error)); }
        finally { this.busy = false; if (!this.closed) controls.forEach(node => { node.disabled = false; }); }
    }

    override onClose(): void { this.closed = true; this.contentEl.empty(); }
}
