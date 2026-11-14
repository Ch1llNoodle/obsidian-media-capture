import { getLanguage } from 'obsidian';
import { en } from './locales/en';
import { fr } from './locales/fr';

export type Locale = 'zh' | 'en' | 'fr';

export function resolveLocale(language: string): Locale {
    const base = language.toLowerCase().split(/[-_]/)[0];
    return base === 'zh' || base === 'fr' ? base : 'en';
}

/** Source messages are catalog keys; substitution never translates user content. */
export function translate(language: string, key: string, ...values: unknown[]): string {
    const locale = resolveLocale(language);
    const messages: Readonly<Record<string, string>> = locale === 'fr' ? fr : en;
    const message = locale === 'zh' || !Object.prototype.hasOwnProperty.call(messages, key) ? key : messages[key]!;
    return message.replace(/\{(\d+)\}/g, (placeholder: string, index: string) =>
        Number(index) < values.length ? String(values[Number(index)]) : placeholder);
}

export function t(key: string, ...values: unknown[]): string {
    return translate(getLanguage(), key, ...values);
}
