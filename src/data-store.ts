import { t } from './i18n';
import { normalizePath, type Plugin } from 'obsidian';
import { episodeUrl, isListeningState } from './core';
import { noteValues } from './note-format';
import { isRecord, parseJson, record } from './validation';

const sourceFields = ['url', 'show', 'title', 'state', 'listened', 'currentdate', 'published', 'description', 'coverpath'];

export function packMetadata(input: unknown): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    for (const [id, inputValues] of Object.entries(record(input))) {
        const values = record(inputValues);
        const saved: Record<string, string> = {};
        for (const field of sourceFields) if (typeof values[field] === 'string' && values[field]) saved[field] = values[field];
        const show = typeof values.show === 'string' ? values.show : '';
        const title = typeof values.title === 'string' ? values.title : '';
        const fullTitle = show ? `${show} · ${title}` : title;
        if (typeof values.fulltitle === 'string' && values.fulltitle !== fullTitle) saved.fulltitle = values.fulltitle;
        result[id] = saved;
    }
    return result;
}

export function unpackMetadata(input: unknown, playback: boolean): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    for (const [id, inputValues] of Object.entries(record(input))) {
        const values = record(inputValues);
        if (typeof values.url !== 'string' || typeof values.title !== 'string' || !isListeningState(values.state)) throw new Error(t("Invalid stored capture: {0}", id));
        const source = episodeUrl(values.url);
        const show = typeof values.show === 'string' ? values.show : '';
        const title = typeof values.fulltitle === 'string' ? values.fulltitle : show ? `${show} · ${values.title}` : values.title;
        const text = (key: string): string => typeof values[key] === 'string' ? values[key] : '';
        result[id] = noteValues({ ...source, title, show, episodeTitle: values.title, state: values.state, date: text('listened'),
            published: text('published'), description: text('description') }, id, text('coverpath'), text('currentdate'), playback);
    }
    return result;
}

/** Settings use Obsidian's data.json; durable capture records have their own file. */
export class CaptureDataStore {
    constructor(private readonly plugin: Plugin) {}

    private get path(): string {
        const directory = this.plugin.manifest.dir ?? `${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;
        return normalizePath(`${directory}/records.json`);
    }

    private async settings(): Promise<Record<string, unknown>> {
        const raw: unknown = await this.plugin.loadData();
        if (raw == null) return {};
        if (!isRecord(raw) || raw.schemaVersion !== 3 || !isRecord(raw.settings) || Object.keys(raw).some(key => !['schemaVersion', 'settings'].includes(key))) {
            throw new Error(t("Unsupported saved data. Use schemaVersion 3 settings and records.json; convert existing data outside the plugin."));
        }
        return raw;
    }

    private async records(): Promise<Record<string, unknown>> {
        const adapter = this.plugin.app.vault.adapter;
        if (!await adapter.exists(this.path)) return {};
        const raw = parseJson(await adapter.read(this.path));
        if (!isRecord(raw) || raw.schemaVersion !== 1 || Object.keys(raw).some(key => !['schemaVersion', 'noteIndex', 'noteMetadata', 'outputEntries'].includes(key))) throw new Error(t("Invalid records.json. Capture records were not changed."));
        if (raw.noteIndex !== undefined && !isRecord(raw.noteIndex) || raw.noteMetadata !== undefined && !isRecord(raw.noteMetadata)
            || raw.outputEntries !== undefined && !Array.isArray(raw.outputEntries)) throw new Error(t("Invalid capture record structure."));
        return raw;
    }

    async load(): Promise<Record<string, unknown>> {
        const settings = await this.settings();
        const records = await this.records();
        return { ...settings, noteIndex: records.noteIndex, outputEntries: records.outputEntries,
            noteMetadata: unpackMetadata(records.noteMetadata, record(settings.settings).playbackIntegration === true) };
    }

    async save(data: Record<string, unknown>): Promise<void> {
        const previousSettings = await this.settings();
        const previousRecords = await this.records();
        const settings = { schemaVersion: 3, settings: data.settings };
        const metadata = packMetadata(data.noteMetadata);
        const records = { schemaVersion: 1,
            ...(Object.keys(record(data.noteIndex)).length ? { noteIndex: data.noteIndex } : {}),
            ...(Object.keys(metadata).length ? { noteMetadata: metadata } : {}),
            ...(Array.isArray(data.outputEntries) && data.outputEntries.length ? { outputEntries: data.outputEntries } : {}) };
        if (JSON.stringify(records) !== JSON.stringify(Object.keys(previousRecords).length ? previousRecords : { schemaVersion: 1 })) {
            const adapter = this.plugin.app.vault.adapter;
            const temporary = this.path + '.tmp';
            const text = JSON.stringify(records, null, 2) + '\n';
            try {
                await adapter.write(temporary, text);
                if (await adapter.read(temporary) !== text) throw new Error(t("Capture records verification failed; records.json was not replaced."));
                await adapter.rename(temporary, this.path);
            } catch (error) {
                try { if (await adapter.exists(temporary)) await adapter.remove(temporary); } catch { /* Keep the original storage error. */ }
                throw error;
            }
        }
        if (JSON.stringify(settings) !== JSON.stringify(previousSettings)) await this.plugin.saveData(settings);
    }
}
