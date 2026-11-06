import { isRecord, isUnknownArray, scalarText } from "./validation";

export function decode(value: unknown): string {
    return scalarText(value).replace(/&#(x[0-9a-f]+|\d+);|&(amp|quot|apos|lt|gt|nbsp);/gi, (raw: string, number: string | undefined, named: string | undefined): string => {
        if (number) {
            const point = number.charAt(0).toLowerCase() === "x" ? parseInt(number.slice(1), 16) : Number(number);
            return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : raw;
        }
        const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
        return entities[named?.toLowerCase() ?? ""] ?? raw;
    });
}

export function plain(value: unknown): string {
    return decode(scalarText(value).replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

export function publicationDate(value: unknown): string {
    const day = typeof value === 'string' ? /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? '' : '';
    if (!day) return '';
    const date = new Date(day + 'T12:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === day ? day : '';
}

export function safeCover(value: unknown): string {
    try {
        if (typeof value !== "string") return "";
        const url = new URL(value.startsWith("//") ? "https:" + value : value);
        const hosts = ["doubanio.com", "xyzcdn.net", "mzstatic.com", "ytimg.com", "hdslb.com"];
        if (url.protocol === "https:" && hosts.some(host => url.hostname === host || url.hostname.endsWith("." + host)) && !url.port && !url.username && !url.password) return url.href;
    } catch { /* Invalid image URLs are ignored so other cover candidates can be tried. */ }
    return "";
}

export function coverUrl(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string") {
            const url = safeCover(value);
            if (url) return url;
        } else if (isUnknownArray(value)) {
            const url = coverUrl(...value);
            if (url) return url;
        } else if (isRecord(value)) {
            const url = coverUrl(value.largePicUrl, value.picUrl, value.smallPicUrl, value.thumbnailUrl, value.url, value.src);
            if (url) return url;
        }
    }
    return "";
}

