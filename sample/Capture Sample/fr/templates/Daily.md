<%*
const sources = app.plugins.plugins['media-capture'].records.daily();
const location = await sources.location();
const [weather, moon, poetry] = await Promise.all([sources.weather(location?.adcode ?? '110000'), sources.moon(location?.city ?? 'Beijing'), sources.poetry()]);
const greeting = await sources.greeting("Écris un bref message quotidien chaleureux en français. Réponds uniquement par le message, en moins de 25 mots.");
const lines = ['### ' + tp.file.title, '', "Lieu: " + (location?.city ?? "Lieu indisponible"), '', "Météo: " + (weather ? weather.dayweather + ' / ' + weather.nightweather : "Météo indisponible"), '', "Phase lunaire: " + (moon ?? "Phase lunaire indisponible"), '', greeting ?? "Passez une journée paisible.", ''];
if (poetry) lines.push('> ' + poetry.content, '');
lines.push('## Notes', '');
tR += lines.join(String.fromCharCode(10));
%>
