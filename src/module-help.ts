import { t } from './i18n';
import type { ModuleId } from './modules';

const guides: Record<ModuleId, { preparation: string; action: string; result: string }> = {
    media: { preparation: '复制播客单集或完整视频分享链接，无需 API Key。', action: '点击侧栏采集图标，或运行“Media Capture: 采集媒体”。获取信息后选择“保存并打开”。', result: '记录按本模块的保存方式生成，具体路径显示在采集窗口下方。' },
    tasks: { preparation: '先在 Obsidian 日记设置中配置目录、日期格式和模板，再设置本模块的任务记录标题。', action: '在普通笔记中完成一条 Markdown 任务；已有完成任务不会补记。', result: '打开当天日记，在配置的标题下查看任务内容、原任务链接和完成时间。' },
    series: { preparation: '需要配套的剧集记录页面。在服务连接中填写 TMDB 的 API Read Access Token。', action: '在配套页面搜索剧集、选择季度，再勾选已看的集数。', result: '观看进度保存到页面指定的数据文件；本模块不单独提供剧集窗口。' },
    reading: { preparation: '需要配套的阅读记录页面，由页面指定书籍与数据保存位置。', action: '在阅读页面选择书籍，填写起始页和当前页，再保存。', result: '当天页码和跨日书签保存到页面指定的数据文件；本模块不单独提供书架。' },
    places: { preparation: '需要配套的地点记录页面。在服务连接中填写高德地图的 Web 服务 Key。', action: '在地点页面搜索并选择地点，确认后记录到访。', result: '地点笔记、到访链接和排序写入页面指定的位置；地图由笔记库展示。' },
    study: { preparation: '需要配套的学习同步按钮。在服务连接中填写墨墨开放接口 Token。', action: '打开今天的日记，点击配套页面中的学习同步按钮。', result: '当天新学与复习词数写入页面指定的日记属性。' },
    exercise: { preparation: '需要配套的运动记录页面，由页面提供视频列表和肌群选项。', action: '在运动页面选择视频对应的肌群，再保存。', result: '选择保存到页面指定的数据文件，人体图和统计由笔记库展示。' },
    douban: { preparation: '先安装 Douban 插件并登录，再准备笔记库的收藏同步页面。', action: '在配套页面点击豆瓣同步按钮，等待收藏列表读取完成。', result: '作品和封面按页面约定保存；本模块不替代 Douban 插件的搜索与逐条导入。' },
    daily: { preparation: '需要调用 Capture 的日记模板。在功能设置中选择来源，再到服务连接填写对应凭证。', action: '使用配套模板创建一篇新日记。仅开启模块不会为已有日记补入信息。', result: '模板将定位、天气、月相、问候语和诗词写入日记；关闭或失败的来源使用模板默认内容。' },
};
export function renderModuleHelp(container: HTMLElement, id: ModuleId): void {
    const details = container.createEl('details', { cls: 'media-module-help' });
    details.createEl('summary', { text: t('怎么使用') });
    const guide = guides[id];
    const list = details.createEl('ol');
    for (const text of [guide.preparation, guide.action, guide.result]) list.createEl('li', { text: t(text) });
    details.createEl('p', { text: t('从 sample/Capture Sample/Start 选择语言和对应示例。') });
}
