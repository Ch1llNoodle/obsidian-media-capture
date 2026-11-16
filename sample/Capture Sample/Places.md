### Places

[[Capture Sample/Start|Choose language]]

#### Preparation

Enable Place tracking and enter an Amap Web Service Key. Search a keyword with an optional city, then choose a result to record today’s visit.

Output: Place notes under places and a places property in today’s sample Daily note.

Paths above are relative to Capture Sample.

After saving, today’s Daily note opens. Inspect its places property and follow the link to the place note. Selecting the same place again reuses its note and keeps one visit link.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "places", lang: "en" });
```

[[Capture Sample/Start|Back to sample guide]]
