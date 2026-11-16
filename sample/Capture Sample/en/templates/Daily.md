<%*
const sources = app.plugins.plugins['media-capture'].records.daily();
const location = await sources.location();
const [weather, moon, poetry] = await Promise.all([sources.weather(location?.adcode ?? '110000'), sources.moon(location?.city ?? 'Beijing'), sources.poetry()]);
const greeting = await sources.greeting("Write a short, gentle daily greeting in English. Reply with only the greeting, under 25 words.");
const lines = ['### ' + tp.file.title, '', "Location: " + (location?.city ?? "Location unavailable"), '', "Weather: " + (weather ? weather.dayweather + ' / ' + weather.nightweather : "Weather unavailable"), '', "Moon phase: " + (moon ?? "Moon phase unavailable"), '', greeting ?? "Have a peaceful day.", ''];
if (poetry) lines.push('> ' + poetry.content, '');
lines.push('## Notes', '');
tR += lines.join(String.fromCharCode(10));
%>
