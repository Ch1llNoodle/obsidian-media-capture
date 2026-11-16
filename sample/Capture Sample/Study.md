### Study

[[Capture Sample/Start|Choose language]]

#### Preparation

Enable Study sync and enter a Maimemo Token. Finish syncing in Maimemo, then press the button. This example syncs today in Asia/Shanghai, not historical dates.

Output: Today’s sample Daily note: new_words, review_words and studied properties.

Paths above are relative to Capture Sample.

After syncing, today’s Daily note opens. Inspect its properties; reopen the note to verify they persist. Counts are replaced with the latest totals, so repeating a sync does not add them again. A positive count sets studied to true; a zero count preserves its existing value. If syncing fails, existing properties remain unchanged; a newly created empty sample Daily note may remain.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "study", lang: "en" });
```

[[Capture Sample/Start|Back to sample guide]]
