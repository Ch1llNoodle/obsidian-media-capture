### Service credentials

[English](Service-connections.md) · [简体中文](Service-connections-zh-CN.md) · [Français](Service-connections-fr.md)

Open **Service connections** after enabling a module or choosing a Daily source. Only credentials needed by those features appear; Amap is shared by place search and weather. Fields are masked, and the eye button reveals a value temporarily. A filled field indicates a saved value, not a tested connection.

| Feature | Service | Value to enter |
| --- | --- | --- |
| Series metadata | TMDB | API Read Access Token, not a v3 API key |
| Study sync | Maimemo | Open API Token |
| Place search and weather | Amap | Web Service Key |
| Location | Tencent Maps | Location-service Key |
| Greeting | DeepSeek | API Key |
| Poetry | Jinrishici | User Token |
| Moon phase | wttr.in | None |

Obtain credentials from your own service account’s API/developer settings. Paste them only into plugin settings. Do not put them in a sample page or a public repository. Disabling a feature hides its fields without deleting values.

Media capture, reading, muscle selection and task logging do not require these service keys. Douban collection sync uses the login saved by the Douban plugin and does not ask for a second password.

Requests run when you capture, search, sync or insert a source template. DeepSeek receives the prompt provided by that template. Tencent IP location, Amap weather and wttr.in receive the relevant location query. Provider titles, weather and backend errors retain their source language.

If requests fail, check the correct credential type, network access and the service account. More detail is in [Troubleshooting](Troubleshooting.md).

[Media Capture](Home.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
