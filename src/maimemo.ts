import { requestUrl } from 'obsidian';
import { record } from './validation';

export interface StudyProgress {
    finished: number;
    total: number;
    study_time: number;
    new_finished: number;
    review_finished: number;
}

async function requestMaimemo(token: string, operation: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!token) throw new Error('请在 Media Capture 设置中填写墨墨 Token。');
    const request = () => requestUrl({
            url: `https://open.maimemo.com/open/api/v1/memo/study/${operation}`,
            method: 'POST', throw: false,
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
    });
    let response;
    try {
        response = await request();
        if (response.status === 503) {
            await new Promise<void>(resolve => window.setTimeout(resolve, 1000));
            response = await request();
        }
    } catch { throw new Error('连接墨墨失败，请检查网络后重试。'); }
    if (response.status === 401 || response.status === 403) throw new Error('墨墨 Token 已失效或无权访问，请在 Media Capture 设置中更新。');
    if (response.status === 429) throw new Error('请求过于频繁，请稍后重试。');
    if (response.status === 503) throw new Error('墨墨服务暂时不可用（HTTP 503），请稍后再试。');
    if (response.status !== 200) throw new Error(`墨墨请求失败：HTTP ${response.status}。`);
    let payload: Record<string, unknown>;
    try { payload = record(response.json); }
    catch { throw new Error('墨墨返回的学习进度格式异常，请稍后重试。'); }
    if (payload.success === false) throw new Error('墨墨未返回学习进度，请检查 Token 并在 App 中完成同步。');
    return record(payload.data ?? payload);
}

export async function fetchStudyProgress(token: string): Promise<StudyProgress> {
    const body = await requestMaimemo(token, 'get_study_progress', {});
    const progress = record(body.progress);
    const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
    if (!integer(progress.finished) || !integer(progress.total) || !integer(progress.study_time)) throw new Error('墨墨返回的学习进度格式异常，请稍后重试。');
    let newFinished = 0, reviewFinished = 0;
    if (progress.finished > 1000) throw new Error('今日已完成词数超过接口单次 1000 条上限，暂无法完整统计新学与复习。');
    if (progress.finished > 0) {
        const result = await requestMaimemo(token, 'get_today_items', { is_finished: true, limit: 1000 });
        if (!Array.isArray(result.today_items)) throw new Error('墨墨返回的单词列表格式异常，请稍后重试。');
        const identities = new Set<string>();
        for (const value of result.today_items) {
            const word = record(value);
            if (typeof word.voc_id !== 'string' || !word.voc_id || typeof word.is_new !== 'boolean' || word.is_finished !== true || identities.has(word.voc_id)) throw new Error('墨墨返回的单词列表格式异常，请稍后重试。');
            identities.add(word.voc_id);
            if (word.is_new) newFinished++; else reviewFinished++;
        }
        if (newFinished + reviewFinished !== progress.finished) throw new Error('墨墨进度与单词列表数量不一致，请稍后重试。');
    }
    return { finished: progress.finished, total: progress.total, study_time: progress.study_time, new_finished: newFinished, review_finished: reviewFinished };
}
