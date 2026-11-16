import { requestUrl, type RequestUrlParam, type RequestUrlResponse } from 'obsidian';
import type { DailySourceId } from './modules';
import { record, errorMessage } from './validation';

/** One budget per generated note. Late responses cannot mutate the caller's note. */
export function requestBudget(send: (options: RequestUrlParam) => Promise<RequestUrlResponse>, budget = 15000) {
    const deadline = Date.now() + budget;
    return (options: RequestUrlParam, limit = 3000): Promise<RequestUrlResponse> => new Promise((resolve, reject) => {
        const remaining = Math.min(limit, deadline - Date.now());
        if (remaining <= 0) { reject(new Error('Daily request time budget exceeded')); return; }
        const timer = window.setTimeout(() => reject(new Error('Daily request timed out')), remaining);
        Promise.resolve().then(() => send(options)).then(
            value => { window.clearTimeout(timer); resolve(value); },
            (error: unknown) => { window.clearTimeout(timer); reject(new Error(errorMessage(error))); },
        );
    });
}
const text = (value: unknown): string => typeof value === 'string' ? value : '';
export function createDailySources(credential: (name: string) => string, active: () => void, enabled: (source: DailySourceId) => boolean) {
    const send = requestBudget(async options => { active(); return requestUrl(options); });
    async function json(source: DailySourceId, options: RequestUrlParam, limit?: number): Promise<Record<string, unknown>> {
        const response = await send(options, limit);
        active();
        if (!enabled(source)) throw new Error('Daily source disabled');
        if (response.status !== 200) throw new Error(`Daily service HTTP ${response.status}`);
        return record(response.json);
    }
    return {
        location: async () => {
            if (!enabled('location')) return null;
            const key = credential('tencentMapKey');
            if (!key) return null;
            try {
                const data = await json('location', { url: `https://apis.map.qq.com/ws/location/v1/ip?key=${encodeURIComponent(key)}` });
                const info = record(record(data.result).ad_info);
                if (data.status !== 0 || !text(info.city) || !/^\d+$/.test(String(info.adcode))) return null;
                return { city: text(info.city).replace(/市$/, ''), adcode: String(info.adcode) };
            } catch { return null; }
        },
        weather: async (city: string) => {
            if (!enabled('weather')) return null;
            const key = credential('amapKey');
            if (!key) return null;
            try {
                const data = await json('weather', { url: `https://restapi.amap.com/v3/weather/weatherInfo?${new URLSearchParams({ key, city, extensions: 'all' })}` });
                const forecasts: unknown[] = Array.isArray(data.forecasts) ? data.forecasts as unknown[] : [];
                const info = record(forecasts[0]);
                const casts: unknown[] = Array.isArray(info.casts) ? info.casts as unknown[] : [];
                const day = record(casts[0]);
                if (!text(info.city) || !text(day.dayweather) || !text(day.nightweather)) return null;
                return { province: text(info.province), city: text(info.city), dayweather: text(day.dayweather), nightweather: text(day.nightweather), daytemp: text(day.daytemp_float), nighttemp: text(day.nighttemp_float) };
            } catch { return null; }
        },
        moon: async (city: string) => {
            if (!enabled('moon')) return null;
            try {
                const response = await send({ url: `https://wttr.in/${encodeURIComponent(city)}?format=%m` }, 2000);
                active();
                return enabled('moon') && response.status === 200 && response.text && !response.text.includes('<') && response.text.length < 5 ? response.text.trim() : null;
            } catch { return null; }
        },
        greeting: async (prompt: string) => {
            if (!enabled('greeting')) return null;
            const key = credential('deepseekKey');
            if (!key) return null;
            try {
                const data = await json('greeting', { url: 'https://api.deepseek.com/v1/chat/completions', method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
                    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.8 }) }, 6000);
                const choices: unknown[] = Array.isArray(data.choices) ? data.choices as unknown[] : [];
                return text(record(record(choices[0]).message).content).trim() || null;
            } catch { return null; }
        },
        poetry: async () => {
            if (!enabled('poetry')) return null;
            const key = credential('jinrishiciToken');
            if (!key) return null;
            try {
                const data = record((await json('poetry', { url: 'https://v2.jinrishici.com/sentence', headers: { 'X-User-Token': key } })).data);
                const origin = record(data.origin);
                if (!text(data.content)) return null;
                return { content: text(data.content), title: text(origin.title), dynasty: text(origin.dynasty), author: text(origin.author) };
            } catch { return null; }
        },
    };
}
