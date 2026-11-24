> **English** · [简体中文](Service-connections-zh-CN.md) · [Français](Service-connections-fr.md)

After enabling a module or selecting a Daily source, open **Settings → Media Capture → Service connections**. Only the credentials required by your active features are shown (Amap is shared by place search and weather).

> [!NOTE]
> Input fields are masked by default; select the eye icon to reveal a value temporarily. A filled field indicates a saved value — it does **not** automatically verify connectivity.

## Credentials reference

| Feature | Provider | Value to enter |
| --- | --- | --- |
| **Series metadata** | TMDB | `API Read Access Token` (not a v3 API key) |
| **Study sync** | Maimemo | Open API Token |
| **Place search & weather** | Amap | Web Service Key |
| **Location** | Tencent Maps | Location-service Key |
| **Greeting** | DeepSeek | API Key |
| **Poetry** | Jinrishici | User Token |
| **Moon phase** | `wttr.in` | None required |

### Features that need no service keys

- **Media capture**, **Reading tracking**, **Exercise tracking**, and **Task completion log** do not require any keys here.
- **Douban sync** reuses the login session saved by the Douban plugin and does not ask for a separate password.

## Security & storage

> [!WARNING]
> Create credentials in each provider’s own developer/API portal and paste them **only** into Media Capture settings. Never place keys in sample pages, Markdown notes, or public repositories.

- Disabling a feature hides its credential fields without deleting your saved values.
- Remove credentials from `data.json` before sharing plugin configuration.

## Network requests & privacy

Requests are sent only when you explicitly capture, search, sync, or insert a Daily source template:

- **DeepSeek** receives the prompt defined by your template.
- **Tencent IP location**, **Amap weather**, and **`wttr.in`** receive the corresponding location query.
- Titles, weather descriptions, and backend errors returned by external providers remain in their source language.

If a request fails, verify the credential type, network access, and provider account permissions. See [Troubleshooting](Troubleshooting.md) for common fixes.

---

[← Feature modules](Modules.md) · [Sample vault →](Sample-vault.md)
