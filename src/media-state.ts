import { t } from './i18n';
import type { MediaState } from './types';

export const MEDIA_STATES = ['completed', 'in-progress', 'wishlist'] as const satisfies readonly MediaState[];

export function isMediaState(value: unknown): value is MediaState {
    return MEDIA_STATES.some(state => state === value);
}

/** Stored identifiers are stable across languages; labels are display-only. */
export function mediaStateLabel(value: string, video = false): string {
    if (!isMediaState(value)) return value;
    const labels: Record<MediaState, string> = video
        ? { completed: t('看过'), 'in-progress': t('在看'), wishlist: t('想看') }
        : { completed: t('听过'), 'in-progress': t('在听'), wishlist: t('想听') };
    return labels[value];
}
