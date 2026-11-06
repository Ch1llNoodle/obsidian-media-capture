export type Provider = 'douban' | 'xiaoyuzhou' | 'apple' | 'youtube' | 'bilibili';
export type ListeningState = '听过' | '在听' | '想听';
export type CaptureMode = 'log' | 'note' | 'both' | 'show' | 'custom';
export interface WriteRule {
    id: string;
    name: string;
    enabled: boolean;
    mode: 'append' | 'create';
    folder: string;
    pathTemplate: string;
    heading: string;
    templateFile: string;
    template: string;
    coverWidth: number;
}
export interface StoredEntry {
    ruleId: string;
    id: string;
    path: string;
    content: string;
    state: ListeningState;
    date: string;
}
export type RecommendationKind = 'book' | 'movie' | 'teleplay' | 'music' | 'game' | 'theater';

export interface RecommendationSource {
    path: string;
    blockId: string;
    title: string;
}

export interface RecommendationItem {
    id: string;
    url: string;
    kind: RecommendationKind;
    title: string;
    cover: string;
}

export interface RecommendationWork extends RecommendationItem {
    path: string;
    state: string;
}

export interface CaptureSettingsData {
    writeRules?: WriteRule[];
    captureMode: CaptureMode;
    noteFolder: string;
    notePathTemplate: string;
    noteTemplateFile: string;
    noteTemplate: string;
    catalogPath: string;
    videoCatalogPath: string;
    playbackIntegration: boolean;
    entryHeading: string;
    imageFolder: string;
    rowTemplate: string;
    downloadCovers: boolean;
    repairOnStartup: boolean;
    dailyIntegration: boolean;
    dailyFolder: string;
    dailyProperty: string;
    bookPath: string;
    moviePath: string;
    teleplayPath: string;
    musicPath: string;
    gamePath: string;
    theaterPath: string;
}

export type TextSettingKey = { [K in keyof CaptureSettingsData]-?: CaptureSettingsData[K] extends string ? K : never }[keyof CaptureSettingsData];
export type ToggleSettingKey = { [K in keyof CaptureSettingsData]-?: CaptureSettingsData[K] extends boolean ? K : never }[keyof CaptureSettingsData];

export interface Episode {
    provider: Provider;
    id: string;
    blockId: string;
    url: string;
}

export interface EpisodeMetadata {
    title: string;
    cover: string;
    show?: string;
    episodeTitle?: string;
    published?: string;
    description?: string;
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
    output?: CaptureMode;
    show?: string;
    episodeTitle?: string;
    published?: string;
    description?: string;
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
    coverPath?: string;
    notePath?: string;
    noteCreated?: boolean;
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
    coverCache?: Record<string, string>;
    settings?: CaptureSettingsData;
    settingsVersion?: number;
    coverReport?: CoverReport;
    noteIndex?: Record<string, string>;
    noteMetadata?: Record<string, Record<string, string>>;
    outputEntries?: StoredEntry[];
}

export interface CaptureUpdatedEvent {
    path: string;
    blockId: string;
    state: ListeningState;
    date: string;
    notePath?: string;
    output?: CaptureMode;
}
