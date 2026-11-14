import { t } from './i18n';
import type { CaptureSettingsData } from './types';
import { validateCredentials } from './credentials';
import { record } from './validation';
import { defaultRules, validateRules } from './write-rules';

export function ruleTargets(settings: Omit<CaptureSettingsData, 'catalogPath' | 'entryHeading'>): CaptureSettingsData {
    return Object.defineProperties(settings, {
        catalogPath: { configurable: true, get: () => { const rule = settings.writeRules.find(rule => rule.id === 'catalog'); return rule ? [rule.folder, rule.pathTemplate].filter(Boolean).join('/') : ''; } },
        entryHeading: { configurable: true, get: () => settings.writeRules.find(rule => rule.id === 'catalog')?.heading ?? '' },
    }) as CaptureSettingsData;
}

export const DEFAULT_SETTINGS: Readonly<CaptureSettingsData> = Object.freeze(ruleTargets({
    writeRules: defaultRules(),
    videoCatalogPath: 'Videos.md',
    playbackIntegration: false,
    imageFolder: 'image/media',
    downloadCovers: true,
    repairOnStartup: false,
    dailyIntegration: false,
    dailyFolder: 'Daily',
    dailyProperty: 'media',
    credentials: [],
    bookPath: 'Recommendations/Books.md',
    moviePath: 'Recommendations/Movies.md',
    teleplayPath: 'Recommendations/Series.md',
    musicPath: 'Recommendations/Music.md',
    gamePath: 'Recommendations/Games.md',
    theaterPath: 'Recommendations/Theater.md',
}));
export function vaultPath(value: unknown, extension = ""): string {
    if (typeof value !== "string") throw new Error(t("路径必须是文本。"));
    const path = value.trim().replace(/\\/g, "/");
    if (!path || path.startsWith("/") || /[:\r\n<>]/.test(path) || path.split("/").some(part => !part || part === "." || part === "..")) throw new Error(t("路径必须是库内相对路径，不能包含空目录、冒号或 ..。"));
    if (extension && !path.toLowerCase().endsWith(extension)) throw new Error(t("文件路径必须以 {0} 结尾。", extension));
    return path;
}

export function validateSettings(settings: unknown): CaptureSettingsData {
    const supplied = record(settings);
    const result = ruleTargets({ ...DEFAULT_SETTINGS, writeRules: defaultRules(), credentials: [] });
    for (const key of Object.keys(supplied)) if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key) || ['catalogPath', 'entryHeading'].includes(key)) throw new Error(t("Unknown settings field: {0}.", key));
    for (const key of ['videoCatalogPath', 'imageFolder', 'dailyFolder', 'dailyProperty', 'bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const) {
        if (supplied[key] !== undefined) {
            if (typeof supplied[key] !== 'string') throw new Error(t("Setting {0} must be text.", key));
            result[key] = supplied[key];
        }
    }
    for (const key of ['downloadCovers', 'repairOnStartup', 'dailyIntegration', 'playbackIntegration'] as const) {
        if (supplied[key] !== undefined) {
            if (typeof supplied[key] !== 'boolean') throw new Error(t("Setting {0} must be boolean.", key));
            result[key] = supplied[key];
        }
    }
    if (supplied.credentials !== undefined) result.credentials = validateCredentials(supplied.credentials);
    if (supplied.writeRules !== undefined) result.writeRules = validateRules(supplied.writeRules);
    result.videoCatalogPath = vaultPath(result.videoCatalogPath, '.md');
    result.imageFolder = vaultPath(result.imageFolder);
    result.dailyFolder = vaultPath(result.dailyFolder);
    result.dailyProperty = result.dailyProperty.trim();
    if (!result.dailyProperty || /[\r\n]/.test(result.dailyProperty) || ['__proto__', 'constructor', 'prototype'].includes(result.dailyProperty)) throw new Error(t("Invalid daily property name."));
    const mediaPaths = [result.catalogPath, result.videoCatalogPath].filter(Boolean).map(path => path.toLowerCase());
    if (new Set(mediaPaths).size !== mediaPaths.length) throw new Error(t("Podcast and video logs must use different paths."));
    for (const key of ['bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const) {
        result[key] = vaultPath(result[key], '.md');
        if (mediaPaths.includes(result[key].toLowerCase())) throw new Error(t("Work collections must not use media log paths."));
    }
    return result;
}

