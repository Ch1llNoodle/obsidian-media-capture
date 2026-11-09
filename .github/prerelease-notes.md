### Media Capture 0.10.2

Podcast covers from the same show now reuse existing artwork when platforms supply resized or recompressed versions. A conservative visual comparison supplements exact byte matching; changed artwork remains separate, and video covers retain exact byte matching.

Same-show candidates are read from configured log rows even when the cover URL cache is empty. The plugin preserves existing image files and records; bulk cleanup remains a vault maintenance task.

Validation covers visual differences, cropping, cache-independent cross-platform reuse, and separate shows. The test suite passes 106 tests, with 3 optional vault integration tests skipped.

Update the runtime files and keep the existing `data.json`. The installation ID remains `media-capture` and the data schema remains version 2.
