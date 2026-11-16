### Identifiants des services

[English](Service-connections.md) · [简体中文](Service-connections-zh-CN.md) · [Français](Service-connections-fr.md)

Après avoir activé un module ou une source quotidienne, ouvrez les connexions aux services. Seuls les identifiants requis apparaissent ; Amap est partagé par lieux et météo. Les champs sont masqués et le bouton œil les révèle temporairement. Une valeur remplie est sauvegardée, pas testée.

| Usage | Service | Valeur |
| --- | --- | --- |
| Séries | TMDB | API Read Access Token, pas une clé API v3 |
| Études | Maimemo | Jeton Open API |
| Lieux et météo | Amap | Clé Web Service |
| Localisation | Tencent Maps | Clé de localisation |
| Message | DeepSeek | Clé API |
| Poésie | Jinrishici | User Token |
| Phase lunaire | wttr.in | Aucun |

Créez les identifiants dans les réglages API/développeur de votre compte de service. Collez-les uniquement dans les paramètres du plugin, jamais dans un exemple ou dépôt public. Désactiver une fonction masque ses champs sans effacer les valeurs.

Capture, lecture, muscles et tâches ne nécessitent pas ces clés. Douban utilise la connexion enregistrée par le plugin Douban, sans second mot de passe.

Les requêtes ont lieu lors d’une capture, recherche, synchronisation ou insertion de modèle. DeepSeek reçoit la consigne fournie par le modèle. Tencent IP, la météo Amap et wttr.in reçoivent la requête de localisation correspondante. Titres, météo et erreurs des services gardent leur langue d’origine.

En cas d’échec, vérifiez le type d’identifiant, le réseau et les droits du compte. Voir [Dépannage](Troubleshooting-fr.md).

[Guide Media Capture](Home-fr.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
