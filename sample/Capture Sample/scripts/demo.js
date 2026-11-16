await (async () => {
// Copied as part of Capture Sample. Requires Dataview JavaScript queries.
const base = 'Capture Sample';
const kind = input?.module;
const plugin = app.plugins.plugins['media-capture'];
if (!plugin) { dv.paragraph('先安装并启用 Media Capture，再重新打开本页。'); return; }
if (!plugin.service.config.modules[kind]) { dv.paragraph('先到 Media Capture → 功能开启本页对应的模块，再重新打开本页。'); return; }
const records = plugin.records;
const root = dv.container.createDiv();
const status = root.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } });
const today = () => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const value = type => parts.find(part => part.type === type).value;
    return value('year') + '-' + value('month') + '-' + value('day');
};
const field = (name, type = 'text', value = '') => {
    const label = root.createEl('label');
    label.createEl('span', { text: name + ' ' });
    const element = label.createEl('input', { type });
    element.value = value;
    element.setAttribute('aria-label', name);
    root.createEl('br');
    return element;
};
const action = (parent, name, work) => {
    const button = parent.createEl('button', { text: name });
    button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = '处理中…';
        try { await work(); }
        catch (error) { status.textContent = error.message ?? String(error); }
        finally { button.disabled = false; }
    });
    return button;
};
const folder = async path => {
    let current = '';
    for (const part of path.split('/')) {
        current = current ? current + '/' + part : part;
        if (!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current);
    }
};
const diaryPath = date => `${base}/daily/${date}.md`;
const ensureDay = async date => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw Error('请选择有效日期。');
    await folder(`${base}/daily`);
    const path = diaryPath(date);
    if (!app.vault.getAbstractFileByPath(path)) await app.vault.create(path, `---\ndate: ${date}\n---\n\n### 示例日记\n\n记录由 Capture Sample 页面保存。\n`);
    return path;
};
try {
    if (kind === 'reading') {
        const store = records.reading(`${base}/data/reading.json`);
        const book = field('书名', 'text', '示例书籍');
        const date = field('记录日期', 'date', today());
        const start = field('起始页', 'number');
        const end = field('当前页', 'number');
        start.min = end.min = '0';
        const load = async () => {
            const value = store.progress(await store.load(), diaryPath(date.value), book.value.trim());
            start.value = String(value.start); end.value = String(value.end);
            status.textContent = value.saved ? `已存：${value.start} → ${value.end} 页` : '尚无当天记录，起始页沿用此前进度。';
        };
        action(root, '载入这本书的进度', load);
        action(root, '保存阅读页码', async () => {
            if (!book.value.trim() || !start.value || !end.value) throw Error('请填写书名、起始页和当前页。');
            const from = Number(start.value), to = Number(end.value);
            if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) throw Error('页码须为非负整数，当前页不能小于起始页。');
            const path = await ensureDay(date.value);
            await store.save(path, book.value.trim(), from, to);
            status.textContent = `已保存 ${to - from} 页；重新打开本页后载入同一本书即可核对。`;
        });
        await load();
    } else if (kind === 'series') {
        const store = records.series(`${base}/data/series.json`);
        const query = field('剧集名称');
        const choices = root.createDiv(), progress = root.createDiv();
        const render = async () => {
            progress.empty();
            for (const [id, snapshot] of Object.entries(await store.readCurrent())) for (const [key, season] of Object.entries(snapshot.seasons)) {
                if (season.active === false) continue;
                progress.createEl('p', { text: season.name });
                for (const episode of season.episodes) {
                    const label = progress.createEl('label');
                    const checked = label.createEl('input', { type: 'checkbox' });
                    checked.checked = season.watched.includes(episode.number);
                    label.createEl('span', { text: ` ${episode.number}. ${episode.name ?? ''} ` });
                    checked.addEventListener('change', async () => {
                        checked.disabled = true;
                        try {
                            const path = await ensureDay(today());
                            await store.change({ id, path, syncCurrent: true, fallback: snapshot }, { type: 'toggle', key, number: episode.number, checked: checked.checked });
                            status.textContent = '观看进度已保存。勾选到某一集会补齐前面的未看集数，取消只影响这一集。';
                            await render();
                        } catch (error) { checked.checked = !checked.checked; checked.disabled = false; status.textContent = error.message; }
                    });
                }
            }
        };
        action(root, '搜索剧集', async () => {
            const results = await records.services.searchTv(query.value);
            choices.empty();
            for (const show of results) action(choices, `${show.name} ${show.year}`, async () => {
                choices.empty();
                for (const season of await records.services.tvSeasons(show.id)) {
                    if (!season.count) continue;
                    action(choices, `${season.name}（${season.count} 集）`, async () => {
                        const episodes = await records.services.tvEpisodes(show.id, season.number);
                        const path = await ensureDay(today());
                        await store.change({ id: String(show.id), path, syncCurrent: true, fallback: (await store.readCurrent())[String(show.id)] }, { type: 'season', seriesId: show.id, season: season.number, name: show.name + ' · ' + season.name, episodes });
                        status.textContent = '季度已关联，可以勾选集数。';
                        await render();
                    });
                }
                status.textContent = '选择一个季度。';
            });
            status.textContent = results.length ? '选择剧集，再选择季度。' : '没有找到剧集，请换个名称。';
        });
        await render();
    } else if (kind === 'places') {
        const query = field('地点关键词'), city = field('城市（可留空）');
        const results = root.createDiv();
        action(root, '搜索地点', async () => {
            const places = await records.services.searchPlaces(query.value, city.value);
            results.empty();
            for (const place of places) action(results, `${place.name} ${place.district}`, async () => {
                const link = await records.place(`${base}/places`, place);
                const path = await ensureDay(today());
                await records.link(path, '旅行', `[[${link}|${place.name.replaceAll('[', '').replaceAll(']', '').replaceAll('|', '')}]]`, true);
                status.textContent = '地点已保存，到访链接已写入今天的示例日记。';
                await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath(path));
            });
            status.textContent = places.length ? '选择地点记录今天的到访。' : '未找到地点。';
        });
    } else if (kind === 'study') {
        action(root, '同步今天的学习数据', async () => {
            const path = await ensureDay(today());
            const result = await records.syncStudy(path, { new_finished: '新学单词数', review_finished: '复习单词数' }, { timeZone: 'Asia/Shanghai', activityField: '学习' });
            status.textContent = `已同步：新学 ${result.new_finished}，复习 ${result.review_finished}。`;
            await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath(path));
        });
    } else if (kind === 'exercise') {
        const store = records.selections(`${base}/data/exercise.json`);
        const video = field('视频链接或稳定名称', 'text', '示例训练');
        const options = root.createDiv();
        const selected = new Map();
        for (const name of ['胸', '背', '肩', '手臂', '核心', '腿']) {
            const label = options.createEl('label');
            selected.set(name, label.createEl('input', { type: 'checkbox' }));
            label.createEl('span', { text: name + ' ' });
        }
        const load = async () => {
            const saved = (await store.load())[video.value.trim()] ?? [];
            for (const [name, checkbox] of selected) checkbox.checked = saved.includes(name);
            status.textContent = '已载入这个视频的肌群选择。';
        };
        action(root, '载入已有选择', load);
        action(root, '保存肌群选择', async () => {
            if (!video.value.trim()) throw Error('请填写视频链接或稳定名称。');
            await store.save(video.value.trim(), [...selected].filter(([, checkbox]) => checkbox.checked).map(([name]) => name));
            status.textContent = '已保存；重新打开页面后载入相同视频即可核对。';
        });
        await load();
    } else if (kind === 'douban') {
        action(root, '同步豆瓣书籍收藏', async () => {
            const cookie = app.plugins.plugins['obsidian-douban-plugin']?.settings?.loginCookiesContent;
            if (!cookie) throw Error('先安装 Douban 插件并登录豆瓣，再同步。');
            const path = `${base}/豆瓣收藏.md`;
            await records.syncDouban({ kind: 'book', path, cookie, catalogs: [{path}], imageFolder: `${base}/image`, onProgress: value => { status.textContent = value; } }, (latest, captured) => {
                const begin = '<!-- douban:start -->', end = '<!-- douban:end -->';
                const first = latest.indexOf(begin), last = latest.indexOf(end);
                if (first < 0 || last <= first) throw Error('同步区域标记缺失，记录未替换。');
                const headings = {collect: '读过', do: '在读', wish: '想读'};
                const sections = Object.entries(headings).map(([state, heading]) => '### ' + heading + '\n\n' + captured.entries.filter(entry => entry.state === state).map(entry => `- ${entry.date} ${entry.cover ? `![|24](<${entry.cover}>) ` : ''}[${entry.label}](<${entry.url}>) ^douban-${entry.id}`).join('\n')).join('\n\n');
                return latest.slice(0, first + begin.length) + '\n\n' + sections + '\n\n' + latest.slice(last);
            });
            status.textContent = '书籍收藏已更新；同步区之外的手写内容保留。';
        });
    }
} catch (error) { status.textContent = error.message ?? String(error); }

})();
