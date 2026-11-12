import { requestUrl } from 'obsidian';

type Row = Record<string, unknown>;
function object(value: unknown): Row {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('TMDB 返回格式无效。');
    return value as Row;
}
function integer(value: unknown): number {
    if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('TMDB 编号无效。');
    return value as number;
}
function title(value: unknown): string { return typeof value === 'string' ? value : ''; }
async function get(token: string, path: string, params: Record<string, string> = {}): Promise<Row> {
    if (!token) throw new Error('请在 Capture 设置中填写 TMDB API Read Access Token。');
    const query = new URLSearchParams({ language: 'zh-CN', ...params });
    const response = await requestUrl({ url: `https://api.tmdb.org/3/${path}?${query.toString()}`,
        headers: { Authorization: `Bearer ${token}` }, throw: false }).catch(() => {
        throw new Error('无法连接 api.tmdb.org。请检查网络或代理是否允许 Obsidian 访问 TMDB，然后重试。');
    });
    if (response.status !== 200) throw new Error(`TMDB 请求失败：HTTP ${response.status}。`);
    return object(response.json);
}
export async function searchTv(token: string, query: string) {
    if (!query.trim()) throw new Error('请输入剧名。');
    const data = await get(token, 'search/tv', { query: query.trim(), include_adult: 'false' });
    if (!Array.isArray(data.results)) throw new Error('TMDB 搜索结果无效。');
    return data.results.map(value => {
        const row = object(value);
        return { id: integer(row.id), name: title(row.name), originalName: title(row.original_name), year: title(row.first_air_date).slice(0, 4) };
    });
}
export async function tvSeasons(token: string, id: number) {
    const data = await get(token, `tv/${integer(id)}`);
    if (!Array.isArray(data.seasons)) throw new Error('TMDB 季度列表无效。');
    return data.seasons.map(value => {
        const row = object(value);
        return { number: integer(row.season_number), name: title(row.name), count: integer(row.episode_count) };
    });
}
export async function tvEpisodes(token: string, id: number, season: number) {
    const data = await get(token, `tv/${integer(id)}/season/${integer(season)}`);
    if (!Array.isArray(data.episodes)) throw new Error('TMDB 分集列表无效。');
    const episodes = data.episodes.map(value => {
        const row = object(value);
        return { number: integer(row.episode_number), name: title(row.name), date: title(row.air_date) };
    });
    if (episodes.some(row => row.number < 1) || new Set(episodes.map(row => row.number)).size !== episodes.length) throw new Error('TMDB 分集编号重复或无效。');
    return episodes;
}
