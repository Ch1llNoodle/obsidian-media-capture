import { resolveLocale } from './i18n';
export function manualUrl(language: string): string {
    const locale = resolveLocale(language);
    const suffix = locale === 'zh' ? '-zh-CN' : locale === 'fr' ? '-fr' : '';
    return 'https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Home' + suffix;
}
