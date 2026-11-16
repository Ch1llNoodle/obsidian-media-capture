<%*
const sources = app.plugins.plugins['media-capture'].records.daily();
const location = await sources.location();
const [weather, moon, poetry] = await Promise.all([sources.weather(location?.adcode ?? '110000'), sources.moon(location?.city ?? '北京'), sources.poetry()]);
const greeting = await sources.greeting('写一句温和简短的日常问候，30字以内。只输出问候语。');
const lines = ['### ' + tp.file.title, '', '位置：' + (location?.city ?? '未获取位置'), '', '天气：' + (weather ? weather.dayweather + ' / ' + weather.nightweather : '未获取天气'), '', '月相：' + (moon ?? '未获取月相'), '', greeting ?? '祝你今天过得轻松。', ''];
if (poetry) lines.push('> ' + poetry.content, '');
lines.push('## Notes', '');
tR += lines.join(String.fromCharCode(10));
%>
