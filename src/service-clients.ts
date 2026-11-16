import type { RequestUrlParam } from 'obsidian';
import { isUnknownArray } from './validation';
export type ServiceRequest = (options: RequestUrlParam) => Promise<{ status: number; json: unknown }>;
export function createServiceClients(requestUrl: ServiceRequest) {
const study = (() => {
    function isRecord(value: unknown): value is Record<string, unknown> {
      return typeof value === "object" && value !== null && !Array.isArray(value);
    }
    function record(value: unknown): Record<string, unknown> {
      return isRecord(value) ? value : {};
    }
    async function requestMaimemo(token: string, operation: string, body: Record<string, unknown>) {
      if (!token) throw new Error("请在 Capture 的自定义凭证中填写 maimemoToken。");
      const request = () => requestUrl({
        url: `https://open.maimemo.com/open/api/v1/memo/study/${operation}`,
        method: "POST",
        throw: false,
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      let response;
      try {
        response = await request();
        if (response.status === 503) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          response = await request();
        }
      } catch {
        throw new Error("连接墨墨失败，请检查网络后重试。");
      }
      if (response.status === 401 || response.status === 403) throw new Error("墨墨 Token 已失效或无权访问，请在 Media Capture 设置中更新。");
      if (response.status === 429) throw new Error("请求过于频繁，请稍后重试。");
      if (response.status === 503) throw new Error("墨墨服务暂时不可用（HTTP 503），请稍后再试。");
      if (response.status !== 200) throw new Error(`墨墨请求失败：HTTP ${response.status}。`);
      let payload;
      try {
        payload = record(response.json);
      } catch {
        throw new Error("墨墨返回的学习进度格式异常，请稍后重试。");
      }
      if (payload.success === false) throw new Error("墨墨未返回学习进度，请检查 Token 并在 App 中完成同步。");
      return record(payload.data ?? payload);
    }
    async function fetchStudyProgress(token: string) {
      const body = await requestMaimemo(token, "get_study_progress", {});
      const progress = record(body.progress);
      const nonNegativeInteger = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
      if (!nonNegativeInteger(progress.finished) || !nonNegativeInteger(progress.total) || !nonNegativeInteger(progress.study_time)) throw new Error("墨墨返回的学习进度格式异常，请稍后重试。");
      let newFinished = 0, reviewFinished = 0;
      if (progress.finished > 1000) throw new Error("今日已完成词数超过接口单次 1000 条上限，暂无法完整统计新学与复习。");
      if (progress.finished > 0) {
        const result = await requestMaimemo(token, "get_today_items", { is_finished: true, limit: 1000 });
        if (!isUnknownArray(result.today_items)) throw new Error("墨墨返回的单词列表格式异常，请稍后重试。");
        const identities = new Set();
        for (const value of result.today_items) {
          const word = record(value);
          if (typeof word.voc_id !== "string" || !word.voc_id || typeof word.is_new !== "boolean" || word.is_finished !== true || identities.has(word.voc_id)) throw new Error("墨墨返回的单词列表格式异常，请稍后重试。");
          identities.add(word.voc_id);
          if (word.is_new) newFinished++;
          else reviewFinished++;
        }
        if (newFinished + reviewFinished !== progress.finished) throw new Error("墨墨进度与单词列表数量不一致，请稍后重试。");
      }
      return { finished: progress.finished, total: progress.total, study_time: progress.study_time, new_finished: newFinished, review_finished: reviewFinished };
    }
    return { fetchStudyProgress };
})();

const tv = (() => {
    function object(value: unknown): Record<string, unknown> {
      if (!value || typeof value !== "object" || isUnknownArray(value)) throw new Error("TMDB 返回格式无效。");
      return value as Record<string, unknown>;
    }
    function integer(value: unknown): number {
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("TMDB 编号无效。");
      return value;
    }
    function title(value: unknown) {
      return typeof value === "string" ? value : "";
    }
    async function get(token: string, path: string, params: Record<string, string> = {}) {
      if (!token) throw new Error("请在 Capture 的自定义凭证中填写 tmdbToken。");
      const query = new URLSearchParams({ language: "zh-CN", ...params });
      const response = await requestUrl({
        url: `https://api.tmdb.org/3/${path}?${query.toString()}`,
        headers: { Authorization: `Bearer ${token}` },
        throw: false
      }).catch(() => {
        throw new Error("无法连接 api.tmdb.org。请检查网络或代理是否允许 Obsidian 访问 TMDB，然后重试。");
      });
      if (response.status !== 200) throw new Error(`TMDB 请求失败：HTTP ${response.status}。`);
      return object(response.json);
    }
    async function searchTv(token: string, query: string) {
      if (!query.trim()) throw new Error("请输入剧名。");
      const data = await get(token, "search/tv", { query: query.trim(), include_adult: "false" });
      if (!isUnknownArray(data.results)) throw new Error("TMDB 搜索结果无效。");
      return data.results.map((value) => {
        const row = object(value);
        return { id: integer(row.id), name: title(row.name), originalName: title(row.original_name), year: title(row.first_air_date).slice(0, 4) };
      });
    }
    async function tvSeasons(token: string, id: number) {
      const data = await get(token, `tv/${integer(id)}`);
      if (!isUnknownArray(data.seasons)) throw new Error("TMDB 季度列表无效。");
      return data.seasons.map((value) => {
        const row = object(value);
        return { number: integer(row.season_number), name: title(row.name), count: integer(row.episode_count) };
      });
    }
    async function tvEpisodes(token: string, id: number, season: number) {
      const data = await get(token, `tv/${integer(id)}/season/${integer(season)}`);
      if (!isUnknownArray(data.episodes)) throw new Error("TMDB 分集列表无效。");
      const episodes = data.episodes.map((value) => {
        const row = object(value);
        return { number: integer(row.episode_number), name: title(row.name), date: title(row.air_date) };
      });
      if (episodes.some((row) => row.number < 1) || new Set(episodes.map((row) => row.number)).size !== episodes.length) throw new Error("TMDB 分集编号重复或无效。");
      return episodes;
    }
    return { searchTv, tvSeasons, tvEpisodes };
})();

const places = (() => {
    const text = (value: unknown) => typeof value === "string" ? value : "";
    function object(value: unknown): Record<string, unknown> {
      if (!value || typeof value !== "object" || isUnknownArray(value)) throw new Error("高德返回格式无效。");
      return value as Record<string, unknown>;
    }
    function offset(lng: number, lat: number): [number, number] {
      const x = lng - 105, y = lat - 35, pi = Math.PI;
      let dy = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      let dx = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      const shared = (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3;
      dy += shared + (20 * Math.sin(y * pi) + 40 * Math.sin(y / 3 * pi)) * 2 / 3 + (160 * Math.sin(y / 12 * pi) + 320 * Math.sin(y * pi / 30)) * 2 / 3;
      dx += shared + (20 * Math.sin(x * pi) + 40 * Math.sin(x / 3 * pi)) * 2 / 3 + (150 * Math.sin(x / 12 * pi) + 300 * Math.sin(x / 30 * pi)) * 2 / 3;
      const rad = lat / 180 * pi, magic = 1 - 0.006693421622965943 * Math.sin(rad) ** 2, root = Math.sqrt(magic);
      return [dx * 180 / (6378245 / root * Math.cos(rad) * pi), dy * 180 / (6378245 * (1 - 0.006693421622965943) / (magic * root) * pi)];
    }
    function gcjToWgs(lng: number, lat: number): [number, number] {
      if (![lng, lat].every(Number.isFinite) || Math.abs(lng) > 180 || Math.abs(lat) > 90) throw new Error("地点坐标无效。");
      if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lat, lng];
      let x = lng, y = lat;
      for (let i = 0; i < 10; i++) {
        const [dx, dy] = offset(x, y);
        const ex = x + dx - lng, ey = y + dy - lat;
        x -= ex;
        y -= ey;
        if (Math.abs(ex) + Math.abs(ey) < 0.00000001) break;
      }
      return [Number(y.toFixed(6)), Number(x.toFixed(6))];
    }
    async function query(key: string, keyword: string, city: string, tips: boolean) {
      if (!key) throw new Error("请在 Capture 的自定义凭证中填写 amapKey。");
      const keywords = keyword.trim();
      if (!keywords || keywords.length > 80) throw new Error("地点名称需要 1–80 个字符。");
      const params = new URLSearchParams({ key, keywords, output: "JSON" });
      if (tips) params.set("datatype", "poi");
      else params.set("page_size", "20");
      if (city.trim()) params.set(tips ? "city" : "region", city.trim());
      const response = await requestUrl({ url: `https://restapi.amap.com/${tips ? "v3/assistant/inputtips" : "v5/place/text"}?${params.toString()}`, throw: false }).catch(() => {
        throw new Error("无法连接高德，请检查网络后重试。");
      });
      if (response.status !== 200) throw new Error(`高德请求失败：HTTP ${response.status}。`);
      const data = object(response.json);
      if (data.status !== "1") {
        const code = text(data.infocode);
        throw new Error(`高德查询失败${/^\d+$/.test(code) ? `（${code}）` : ""}，请检查 Web 服务 Key、服务权限和调用额度。`);
      }
      const rows = data[tips ? "tips" : "pois"];
      if (!isUnknownArray(rows)) throw new Error("高德地点列表无效。");
      const seen = new Set();
      return rows.flatMap((value) => {
        const row = object(value), id = text(row.id), name = text(row.name), location = text(row.location);
        if (!id || !name || seen.has(id)) return [];
        const parts = location.split(",").map((part) => part.trim());
        if (parts.length !== 2 || parts.some((part) => !part)) return [];
        const lng = Number(parts[0]), lat = Number(parts[1]);
        if (![lng, lat].every(Number.isFinite) || Math.abs(lng) > 180 || Math.abs(lat) > 90) return [];
        seen.add(id);
        return [{ id, name, district: tips ? text(row.district) : [text(row.pname), text(row.cityname), text(row.adname)].join(""), address: text(row.address), gcj02: location, coordinates: gcjToWgs(lng, lat) }];
      });
    }
    const searchPlaces = (key: string, keyword: string, city = "") => query(key, keyword, city, false);
    const suggestPlaces = (key: string, keyword: string, city = "") => query(key, keyword, city, true);
    return { gcjToWgs, searchPlaces, suggestPlaces };
})();

return { study, tv, places };

}
export type ServiceClients = ReturnType<typeof createServiceClients>;
export type Place = Awaited<ReturnType<ServiceClients["places"]["searchPlaces"]>>[number];
