import type { CaptureSettingsData } from './types';
import { t } from './i18n';

export const moduleDefinitions = [
    { id: 'media', name: '媒体采集', description: '采集播客与视频，管理写入规则、封面和作品关联。', services: [] },
    { id: 'tasks', name: '任务完成记录', description: '将任务内容、来源和完成时间记录到日记。', services: [] },
    { id: 'series', name: '剧集记录', description: '关联剧集资料，保存分集观看进度。', services: ['tmdbToken'] },
    { id: 'reading', name: '阅读记录', description: '保存每日阅读页码和跨日书签。', services: [] },
    { id: 'places', name: '地点记录', description: '搜索地点，创建地点笔记并保存到访记录。', services: ['amapKey'] },
    { id: 'study', name: '学习同步', description: '同步当天的新学与复习词数。', services: ['maimemoToken'] },
    { id: 'exercise', name: '运动记录', description: '保存视频对应的肌群选择。', services: [] },
    { id: 'douban', name: '豆瓣同步', description: '批量同步收藏列表，使用 Douban 插件的登录状态。', services: [] },
    { id: 'daily', name: '日记信息', description: '按需获取定位、天气、月相、问候语和诗词。', services: [] },
] as const;
export type ModuleId = typeof moduleDefinitions[number]['id'];
export type ModuleSettings = Record<ModuleId, boolean>;
export const defaultModules = (): ModuleSettings => ({ media: true, tasks: false, series: false, reading: false, places: false, study: false, exercise: false, douban: false, daily: false });

export const serviceDefinitions = [
    { id: 'tmdbToken', name: 'TMDB', description: '搜索电视剧、获取季度与分集。使用 API Read Access Token。' },
    { id: 'maimemoToken', name: '墨墨背单词', description: '同步当天的新学与复习词数。' },
    { id: 'amapKey', name: '高德地图', description: '地点搜索与日记天气共用的 Web 服务 Key。' },
    { id: 'tencentMapKey', name: '腾讯地图', description: '通过 IP 获取日记所在地。' },
    { id: 'deepseekKey', name: 'DeepSeek', description: '根据日记中的位置与天气生成问候语。' },
    { id: 'jinrishiciToken', name: '今日诗词', description: '获取日记中的每日诗词。' },
] as const;
export const dailySourceDefinitions = [
    { id: 'location', name: '定位', provider: 'tencent', label: '腾讯地图', credential: 'tencentMapKey' },
    { id: 'weather', name: '天气', provider: 'amap', label: '高德地图', credential: 'amapKey' },
    { id: 'moon', name: '月相', provider: 'wttr', label: 'wttr.in', credential: null },
    { id: 'greeting', name: '问候语', provider: 'deepseek', label: 'DeepSeek', credential: 'deepseekKey' },
    { id: 'poetry', name: '诗词', provider: 'jinrishici', label: '今日诗词', credential: 'jinrishiciToken' },
] as const;
export type DailySourceId = typeof dailySourceDefinitions[number]['id'];
export type DailySourceSettings = Record<DailySourceId, string>;
export const defaultDailySources = (): DailySourceSettings => ({ location: 'none', weather: 'none', moon: 'none', greeting: 'none', poetry: 'none' });
export function requiredServices(config: Pick<CaptureSettingsData, 'modules' | 'dailySources'>): Set<string> {
    const keys = new Set<string>();
    for (const module of moduleDefinitions) if (config.modules[module.id]) for (const key of module.services) keys.add(key);
    if (config.modules.daily) for (const source of dailySourceDefinitions) if (config.dailySources[source.id] === source.provider && source.credential) keys.add(source.credential);
    return keys;
}
export function requireModule(config: Pick<CaptureSettingsData, 'modules'>, id: ModuleId): void {
    if (!config.modules[id]) throw new Error(t('请先启用功能模块：{0}', t(moduleDefinitions.find(module => module.id === id)!.name)));
}
