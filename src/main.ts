import { CaptureGuideModal } from './getting-started';
import { t } from './i18n';
import { Notice, Plugin, type Command } from 'obsidian';
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
    get supportsRecommendations(): boolean { return this.activeSettings.modules.media; }
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
        this.records = new CaptureRecords(this.app, name => this.getCredential(name), () => { void this.activeSettings; }, () => this.activeSettings);
        this.taskLog = new TaskCompletionLog(this, () => this.service.config);
        this.taskLog.configure();
        this.service.notes.register(this);
        this.service.appends.register(this);
        this.addSettingTab(new CaptureSettings(this.app, this.service));
        this.addCommand({ id: 'getting-started', name: t('打开使用指南'), callback: () => new CaptureGuideModal(this.service).open() });
        this.addRibbonIcon('plus', t('采集媒体'), () => {
            if (this.service.config.modules.media) new CaptureModal(this.service).open();
            else new CaptureGuideModal(this.service).open();
        });
        registerRecommendationUI(this, this.service);
        this.addMediaCommand({
            id: 'capture-media', name: t("采集媒体"),
            callback: () => new CaptureModal(this.service).open(),
        });
        this.addMediaCommand({
            id: 'create-media-note', name: t("创建媒体笔记"),
            callback: () => new CaptureModal(this.service, { output: 'note', item: {
                id: '', url: '', title: '', state: "completed", date: '',
            } }).open(),
        });
        this.addMediaCommand({
            id: 'apply-note-template', name: t("将模板应用到已有记录"),
            callback: () => new NoteRefreshModal(this.service).open(),
        });
        this.addMediaCommand({
            id: 'open-media-log', name: t("打开媒体记录"),
            callback: async () => {
                const file = await this.service.ensureCatalog();
                await this.app.workspace.getLeaf(false).openFile(file);
            },
        });
        this.addMediaCommand({
            id: 'repair-covers', name: t("补全缺失封面"),
            callback: () => {
                void this.service.repairCovers().catch((error: unknown) => {
                    new Notice(error instanceof Error ? error.message : String(error));
                });
            },
        });
        this.app.workspace.onLayoutReady(() => this.service.repairOnReady());
    }

    private addMediaCommand(command: Command): void {
        this.addCommand({ ...command, checkCallback: checking => {
            if (!this.activeSettings.modules.media) return false;
            if (!checking) command.callback?.();
            return true;
        } });
    }

    override onunload(): void {
        this.service?.dispose();
    }
}
