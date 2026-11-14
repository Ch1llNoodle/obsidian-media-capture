import { t } from './i18n';
import type { Credential } from './types';
import { isRecord } from './validation';

export function validateCredentials(value: unknown): Credential[] {
    if (!Array.isArray(value) || value.length > 100) throw new Error(t("自定义凭证需要是最多 100 项的列表。"));
    const names = new Set<string>();
    return value.map((entry: unknown) => {
        if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.value !== 'string'
            || Object.keys(entry).some(key => !['name', 'value'].includes(key))) throw new Error(t("凭证必须包含字段名和文本值。"));
        const name = entry.name.trim();
        if (!name || name.length > 80 || Array.from(name).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error(t("字段名需要 1–80 个字符，不能包含控制字符。"));
        if (names.has(name)) throw new Error(t("凭证字段名不能重复。"));
        names.add(name);
        return { name, value: entry.value };
    });
}

