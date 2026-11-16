### Sample vault

[English](Sample-vault.md) · [简体中文](Sample-vault-zh-CN.md) · [Français](Sample-vault-fr.md)

#### Copy the examples

1. Open the [source repository](https://github.com/Ch1llNoodle/obsidian-media-capture), choose **Code → Download ZIP**, extract it and open sample.
2. Copy the entire **Capture Sample** folder into your Obsidian vault root. Keep its name, scripts/demo.js and scripts/strings.json.
3. Open **Capture Sample/Start.md** and choose English, 简体中文 or Français. Each language includes instructions, interactive controls, status messages and Daily templates.
4. Enable the modules named by the pages you want to try. Enter only the required credentials.

#### Dependencies

Media capture needs only Media Capture. Task logging additionally needs core Daily notes. Interactive reading, series, places, study, exercise and Douban pages require Dataview with **Enable JavaScript Queries** enabled; open pages in Reading view. Daily source templates require Templater instead.

#### Try an offline example

Open the Reading example, enter a book and date, load progress, enter page numbers and save. Reload the same book to verify. Exercise works similarly: enter a video identifier, select muscles, save and reload. Neither needs a service key.

The series example supports search, season selection and checkboxes. Places searches and writes visit links. Study saves today’s word counts. Douban demonstrates book collections only. Daily source examples explain exactly how to insert their Templater template into an empty dated note.

#### Data and language

Tracker JSON stays under Capture Sample/data. Generated Daily notes are under daily, place notes under places and covers under image. Media and task logging follow existing plugin/core Daily settings. Dates use Asia/Shanghai.

Changing example language changes controls, help and template text. Stable book, video and muscle identifiers remain the same, so saved choices can be loaded in another language. Service-returned titles and weather are not automatically translated. Your own names and record contents are never translated.

Opening examples reads local data only. It does not import settings, create data or contact services. Clicking a save/search/sync button or inserting a source template is the explicit action that writes or requests data.

[Media Capture](Home.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
