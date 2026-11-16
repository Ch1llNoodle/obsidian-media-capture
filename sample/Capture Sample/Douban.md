### Douban

[[Capture Sample/Start|Choose language]]

#### Preparation

Enable Douban sync. Install the Douban plugin and sign in there. This example syncs finished, reading and wishlist book collections. Syncing many books may take time.

Output: The marked region below. Covers are saved under image. Personal notes outside the markers are preserved.

Paths above are relative to Capture Sample.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "douban", lang: "en", path: dv.current().file.path });
```

<!-- douban:start -->

<!-- douban:end -->

### Notes

[[Capture Sample/Start|Back to sample guide]]
