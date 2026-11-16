import { t } from './i18n';
import { Notice, Plugin } from 'obsidian';
import { CaptureService } from './service';
import { CaptureModal } from './capture-modal';
import { CaptureSettings } from './settings-ui';
import { registerRecommendationUI } from './recommendation-ui';
import { NoteRefreshModal } from './note-refresh-ui';
import type { CaptureSettingsData } from './types';
import { TaskCompletionLog } from './task-completion';
import { CaptureRecords } from './record-api';

export default class MediaCapture extends Plugin {
    service!: CaptureService;
    private taskLog: TaskCompletionLog | undefined;
    readonly supportsRecommendations = true;
    records!: CaptureRecords;

    private get activeSettings(): CaptureSettingsData {
        if (!this.service || this.service.unloaded) throw new Error(t("请重新启用 Media Capture。"));
        return this.service.config;
    }

    getCredential(name: string): string {
        return this.activeSettings.credentials.find(entry => entry.name === name)?.value ?? '';
    }

    override async onload(): Promise<void> {
        this.service = new CaptureService(this, () => this.taskLog?.configure());
        await this.service.initialize();
        this.records = new CaptureRecords(this.app, name => this.getCredential(name), () => { void this.activeSettings; });
        this.taskLog = new TaskCompletionLog(this, () => this.service.config);
        this.taskLog.configure();
        this.service.notes.register(this);
        this.service.appends.register(this);
        this.addSettingTab(new CaptureSettings(this.app, this.service));
        registerRecommendationUI(this, this.service);
        this.addCommand({
            id: 'capture-media', name: t("采集媒体"),
            callback: () => new CaptureModal(this.service).open(),
        });
        this.addCommand({
            id: 'create-media-note', name: t("创建媒体笔记"),
            callback: () => new CaptureModal(this.service, { output: 'note', item: {
                id: '', url: '', title: '', state: "completed", date: '',
            } }).open(),
        });
        this.addCommand({
            id: 'apply-note-template', name: t("将模板应用到已有记录"),
            callback: () => new NoteRefreshModal(this.service).open(),
        });
        this.addCommand({
            id: 'open-media-log', name: t("打开媒体记录"),
            callback: async () => {
                const file = await this.service.ensureCatalog();
                await this.app.workspace.getLeaf(false).openFile(file);
            },
        });
        this.addCommand({
            id: 'repair-covers', name: t("补全缺失封面"),
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
