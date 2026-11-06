import { Notice, Plugin } from 'obsidian';
import { PodcastService } from './service';
import { CaptureModal } from './capture-modal';
import { CaptureSettings } from './settings-ui';
import { registerRecommendationUI } from './recommendation-ui';

export default class PodcastCapture extends Plugin {
    service!: PodcastService;
    readonly supportsRecommendations = true;

    override async onload(): Promise<void> {
        this.service = new PodcastService(this);
        await this.service.initialize();
        this.service.notes.register(this);
        this.addSettingTab(new CaptureSettings(this.app, this.service));
        registerRecommendationUI(this, this.service);
        this.addCommand({
            id: 'add-podcast', name: '添加播客',
            callback: () => new CaptureModal(this.service).open(),
        });
        this.addCommand({
            id: 'create-episode-note', name: '创建单集笔记',
            callback: () => new CaptureModal(this.service, { output: 'note', item: {
                id: '', url: '', title: '', state: '听过', date: '',
            } }).open(),
        });
        this.addCommand({
            id: 'open-podcasts', name: '打开播客记录',
            callback: async () => {
                const file = await this.service.ensureCatalog();
                await this.app.workspace.getLeaf(false).openFile(file);
            },
        });
        this.addCommand({
            id: 'repair-covers', name: '补全缺失封面',
            callback: () => {
                void this.service.repairCovers().catch((error: unknown) => {
                    new Notice(error instanceof Error ? error.message : String(error));
                });
            },
        });
        this.app.workspace.onLayoutReady(() => this.service.repairOnReady());
    }

    override onunload(): void {
        this.service?.dispose();
    }
}
