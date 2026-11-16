### Capture sample

[[Capture Sample/Start|English]] · [[Capture Sample/zh-CN/开始使用|简体中文]] · [[Capture Sample/fr/Demarrer|Français]]

Copy all of Capture Sample to your vault root, keep its name, and open this page. Enable Media Capture first.

#### First media record

1. Click the capture icon in the sidebar, or run Media Capture: Capture media.
2. Paste a podcast episode or full YouTube/Bilibili video link and fetch its information.
3. Review the destination shown below the form and choose Save and open. No API key or Dataview is needed for media capture.

#### Examples

Interactive examples require Dataview. Install it through Settings → Community plugins → Browse, enable it, then enable JavaScript Queries in its settings. Open sample pages in Reading view. Each page names its required Capture module. Fill only the credentials for features you enable. Daily source templates use Templater instead.

| Example | Requirements | Action |
| --- | --- | --- |
| [[Capture Sample/Reading\|Reading]] | Enable Reading tracking. No credentials needed. Enter a book title and date, load its progress, enter start and current pages, then save. The same title identifies the same book; load again after changing it. | data/reading.json and the sample Daily note for the selected date. |
| [[Capture Sample/Series\|Series]] | Enable Series tracking and enter the TMDB API Read Access Token in Service connections. Search a series, choose a season, then check episodes. Checking an episode includes earlier unwatched episodes; unchecking affects only that episode. | data/series.json. Reopening the page reloads linked seasons and progress. |
| [[Capture Sample/Places\|Places]] | Enable Place tracking and enter an Amap Web Service Key. Search a keyword with an optional city, then choose a result to record today’s visit. | Place notes under places and a places property in today’s sample Daily note. |
| [[Capture Sample/Study\|Study]] | Enable Study sync and enter a Maimemo Token. Finish syncing in Maimemo, then press the button. This example syncs today in Asia/Shanghai, not historical dates. | Today’s sample Daily note: new_words, review_words and studied properties. |
| [[Capture Sample/Exercise\|Exercise]] | Enable Exercise tracking. No credentials needed. Enter a video link or stable name, load saved choices, select muscle groups, then save. | data/exercise.json. Muscle identifiers are stable across languages; the bundled body map supports male/female and front/back views, and shares selections with the checkboxes. |
| [[Capture Sample/Douban\|Douban]] | Enable Douban sync. Install the Douban plugin and sign in there. This example syncs finished, reading and wishlist book collections. Syncing many books may take time. | The marked region below. Covers are saved under image. Personal notes outside the markers are preserved. |

- [[Capture Sample/Tasks|Task logging]]
- [[Capture Sample/Daily-sources|Daily sources]]

Tracker data is saved under Capture Sample/data, sample Daily notes under Capture Sample/daily, places under Capture Sample/places and covers under Capture Sample/image. Media and task logging keep your existing plugin and Daily notes settings. Example dates use Asia/Shanghai. Titles and weather returned by services remain in their source language.

Series also creates today’s sample Daily note under Capture Sample/daily as its dated target; reopen the Series page to check the interactive episode list.
