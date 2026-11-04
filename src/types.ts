export type Provider = 'douban' | 'xiaoyuzhou' | 'apple';
export type ListeningState = '听过' | '在听' | '想听';

export interface CaptureSettingsData {
    catalogPath: string;
    entryHeading: string;
    imageFolder: string;
    rowTemplate: string;
    downloadCovers: boolean;
    repairOnStartup: boolean;
    dailyIntegration: boolean;
    dailyFolder: string;
    dailyProperty: string;
}

export type TextSettingKey = { [K in keyof CaptureSettingsData]: CaptureSettingsData[K] extends string ? K : never }[keyof CaptureSettingsData];
export type ToggleSettingKey = { [K in keyof CaptureSettingsData]: CaptureSettingsData[K] extends boolean ? K : never }[keyof CaptureSettingsData];

export interface Episode {
    provider: Provider;
    id: string;
    blockId: string;
    url: string;
}

export interface EpisodeMetadata {
    title: string;
    cover: string;
}

// Optional identity fields preserve the pre-settings Douban record format.
export interface EntryIdentity {
    id: string;
    provider?: Provider;
    blockId?: string;
    title?: string;
}

export interface CaptureItem extends EntryIdentity {
    url: string;
    title: string;
    state: ListeningState;
    date: string;
    cover?: string;
    repairOnly?: boolean;
}

export interface CatalogUpdate {
    text: string;
    existing: string | null;
    preserved: boolean;
}

export interface CaptureResult {
    hasCover: boolean;
    coverError: string;
    coverSource: string;
    message: string;
}

export interface CoverFailure {
    title: string;
    url: string;
    imageUrl?: string;
    error: string;
}

export interface CoverRepairResult {
    repaired: number;
    failures: CoverFailure[];
}

export interface CoverReport extends CoverRepairResult {
    checkedAt: string;
}

export interface SavedDataPatch {
    settings?: CaptureSettingsData;
    settingsVersion?: number;
    coverReport?: CoverReport;
}

export interface CaptureUpdatedEvent {
    path: string;
    blockId: string;
    state: ListeningState;
    date: string;
}
