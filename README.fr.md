# Media Capture

> [English](README.md) · [简体中文](README.zh-CN.md) · **Français**  
> [Guide utilisateur (Wiki)](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Home-fr) · [Coffre exemple](sample/README.md) · [Versions publiées](https://github.com/Ch1llNoodle/obsidian-media-capture/releases)

Enregistrez en Markdown les podcasts de **Douban**, **Xiaoyuzhou** et **Apple Podcasts** ainsi que les vidéos **YouTube** et **Bilibili**. Choisissez une liste commune, des notes individuelles ou un fichier par émission/chaîne. Par défaut, les podcasts vont dans `Podcasts.md` et les vidéos dans `Videos.md`.

## Installation

Nécessite **Obsidian 1.8.7** ou ultérieur.

- **BRAT (recommandé) :** installez et activez [BRAT](https://github.com/TfTHacker/obsidian42-brat), ajoutez `Ch1llNoodle/obsidian-media-capture`, choisissez une version publiée, puis activez **Media Capture**.
- **Manuelle :** téléchargez `main.js`, `manifest.json` et `styles.css` depuis les [versions publiées](https://github.com/Ch1llNoodle/obsidian-media-capture/releases), placez-les dans `<Coffre>/.obsidian/plugins/media-capture/`, puis activez le plugin dans **Paramètres → Plugins communautaires**.

> [!IMPORTANT]
> Lors d’une mise à jour manuelle, remplacez uniquement ces trois fichiers et rechargez le plugin. Conservez `data.json` et `records.json`.

## Première utilisation

1. Sélectionnez l’icône de capture dans le ruban ou la commande **Media Capture: Capturer un média**.
2. Collez le lien d’un épisode ou l’adresse complète d’une vidéo, puis récupérez ses informations.
3. Vérifiez le titre, l’état, la date et l’aperçu de destination, puis choisissez **Enregistrer et ouvrir**.

> [!TIP]
> La capture de base ne nécessite **aucun identifiant de service**. Utilisez un lien d’épisode Apple Podcasts (avec le paramètre `i`) et développez d’abord les liens courts Bilibili. Si la récupération échoue, saisissez un titre ; une couverture manquante n’empêche pas l’enregistrement.

Configurez les [modes d’enregistrement](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Save-layouts-fr) dans **Fonctions → Capture de médias → Réglages de la fonction**. L’icône d’aide près du titre ouvre le guide intégré.

## Fonctions et exemples

| Domaine | Aperçu |
| --- | --- |
| **Médias** | Règles d’écriture et modèles Markdown personnalisés, couvertures locales, associations d’œuvres et liens quotidiens facultatifs. La lecture dans Obsidian nécessite un lecteur compatible configuré séparément. |
| **Journal des tâches** | Enregistre les tâches Markdown terminées et leur lien source dans la note du jour selon les réglages des **Notes quotidiennes** principales. Décocher conserve le journal ; terminer à nouveau actualise l’heure. |
| **Suivi et synchronisation** | Modules facultatifs pour séries, lecture, lieux, études, sport, collections Douban et sources quotidiennes. Voir [Modules](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Modules-fr) pour les accès et dépendances. |

Pour essayer les suivis interactifs sans coder, copiez tout le dossier [Capture Sample](sample/README.md) à la racine du coffre et ouvrez `Start.md` pour choisir une langue :

- Les suivis interactifs nécessitent **Dataview** avec **Enable JavaScript Queries** activé.
- Les modèles quotidiens utilisent **Templater** et le journal des tâches les **Notes quotidiennes** principales.
- L’exemple Sport inclut les schémas corporels ; conservez tous les scripts et fichiers du dossier.

Renseignez les [identifiants](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Service-connections-fr) des fonctions activées dans **Services**. La synchronisation des collections Douban réutilise la session du plugin Douban.

## Données et réseau

- **Fichiers locaux :** `data.json` contient les paramètres et identifiants ; `records.json` conserve les métadonnées capturées et l’index des sorties. Synchronisez les deux fichiers entre appareils et retirez les identifiants avant de partager une configuration. Les données exemples restent dans `Capture Sample`.
- **Requêtes réseau :** la capture et la réparation des couvertures contactent les plateformes, catalogues publics et services d’images. Les recherches, synchronisations et sources activées contactent leurs fournisseurs. DeepSeek reçoit la consigne du modèle ; les requêtes Douban utilisent un cookie de connexion. **Le plugin ne comporte aucune télémétrie.** Le [Guide utilisateur](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Home-fr) détaille les services et le dépannage.
- **Langues et plateformes :** l’interface suit la langue d’Obsidian (chinois, anglais et français). Le plugin peut être activé sur ordinateur et mobile ; les interactions mobiles et la lecture restent à tester sur appareil.

## Développement

```sh
npm ci
npm run build
npm test
npm run lint
```

Les fichiers compilés sont dans `release/media-capture/`. Pour déployer localement, copiez `.deploy.example.json` vers `.deploy.local.json`, renseignez le chemin absolu du coffre dans `vaultPath`, puis exécutez `npm run deploy`. Le déploiement conserve paramètres et enregistrements. Séparez le dépôt source du dossier du plugin installé.

## Licence

[Zero-Clause BSD](LICENSE). Les sources et la licence MIT des schémas exemples sont dans [assets](sample/Capture%20Sample/assets/SOURCE.md).
