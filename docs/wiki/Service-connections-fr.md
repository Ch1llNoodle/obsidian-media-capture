> [English](Service-connections.md) · [简体中文](Service-connections-zh-CN.md) · **Français**

Après avoir activé un module ou sélectionné une source quotidienne, ouvrez **Paramètres → Media Capture → Services**. Seuls les identifiants requis par vos fonctions actives s’affichent (Amap est partagé entre recherche de lieux et météo).

> [!NOTE]
> Les champs sont masqués par défaut ; le bouton œil les révèle temporairement. Une valeur renseignée indique un enregistrement sauvegardé, **pas** un test de connexion réussi.

## Référence des identifiants

| Usage | Fournisseur | Valeur à renseigner |
| --- | --- | --- |
| **Séries** | TMDB | `API Read Access Token` (pas une clé API v3) |
| **Études** | Maimemo | Jeton Open API |
| **Lieux et météo** | Amap | Clé Web Service |
| **Localisation** | Tencent Maps | Clé de localisation |
| **Message** | DeepSeek | Clé API |
| **Poésie** | Jinrishici | User Token |
| **Phase lunaire** | `wttr.in` | Aucun |

### Fonctions sans clé de service

- **Capture de médias**, **Lecture**, **Sport** et **Journal des tâches** ne nécessitent aucune de ces clés.
- **Douban** réutilise la session enregistrée par le plugin Douban sans demander de second mot de passe.

## Sécurité et stockage

> [!WARNING]
> Créez vos identifiants depuis l’espace API/développeur de votre propre compte et collez-les **uniquement** dans les paramètres du plugin — jamais dans une page exemple, une note Markdown ou un dépôt public.

- Désactiver une fonction masque ses champs sans supprimer les valeurs enregistrées.
- Retirez vos identifiants de `data.json` avant de partager une configuration.

## Requêtes réseau et confidentialité

Les requêtes ne sont envoyées que lorsque vous lancez explicitement une capture, recherche, synchronisation ou insertion de modèle :

- **DeepSeek** reçoit la consigne définie par votre modèle.
- **Tencent IP**, la météo **Amap** et **`wttr.in`** reçoivent la requête de localisation correspondante.
- Les titres, prévisions météo et erreurs renvoyés par les services conservent leur langue d’origine.

En cas d’échec, vérifiez le type d’identifiant, l’accès réseau et les droits du compte. Voir [Dépannage](Troubleshooting-fr.md).

---

[← Modules](Modules-fr.md) · [Coffre exemple →](Sample-vault-fr.md)
