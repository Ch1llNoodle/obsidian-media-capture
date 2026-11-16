### Series

[[Capture Sample/Start|Choose language]]

#### Preparation

Enable Series tracking and enter the TMDB API Read Access Token in Service connections. Search a series, choose a season, then check episodes. Checking an episode includes earlier unwatched episodes; unchecking affects only that episode.

Output: data/series.json and today’s sample Daily note under daily. Reopening the page reloads linked seasons and progress from the JSON file. The Daily note is the dated record target; the interactive episode list is shown here.

Paths above are relative to Capture Sample.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "series", lang: "en" });
```

[[Capture Sample/Start|Back to sample guide]]
