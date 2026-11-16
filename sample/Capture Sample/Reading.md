### Reading

[[Capture Sample/Start|Choose language]]

#### Preparation

Enable Reading tracking. No credentials needed. Enter a book title and date, load its progress, enter start and current pages, then save. The same title identifies the same book; load again after changing it.

Output: data/reading.json and the sample Daily note for the selected date.

Paths above are relative to Capture Sample.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "reading", lang: "en" });
```

[[Capture Sample/Start|Back to sample guide]]
