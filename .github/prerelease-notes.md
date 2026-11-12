### Media Capture 0.13.0

Add optional TMDB integration for TV series search, season selection, and episode metadata. Configure the API Read Access Token in Capture settings. Vault views can call searchTv(query), tvSeasons(id), and tvEpisodes(id, season).

Requests use https://api.tmdb.org/3 through Obsidian's request API. Connection failures show a network troubleshooting message. Credentials remain in plugin settings; episode lists, viewing progress, diary snapshots, and presentation remain owned by vault views. No background requests or persistent episode cache are added to the plugin.

The optional Maimemo study integration remains available. Both integrations use masked credential fields and reject whitespace in tokens.

Validation: production build passes; 121 tests pass and 3 optional vault integration tests are skipped. Desktop TMDB search was verified by the user. iPhone interaction has not been verified.
