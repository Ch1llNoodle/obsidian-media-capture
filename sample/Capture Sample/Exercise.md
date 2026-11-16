### Exercise

[[Capture Sample/Start|Choose language]]

#### Preparation

Enable Exercise tracking. No credentials needed. Enter a video link or stable name, load saved choices, select muscle groups, then save.

Output: data/exercise.json. Muscle identifiers are stable across languages; the bundled body map supports male/female and front/back views, and shares selections with the checkboxes.

Paths above are relative to Capture Sample.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "exercise", lang: "en" });
```

[[Capture Sample/Start|Back to sample guide]]
