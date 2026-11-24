> [English](Troubleshooting.md) · [简体中文](Troubleshooting-zh-CN.md) · **Français**

## Problèmes fréquents

| Symptôme | Vérifications |
| --- | --- |
| **Aucun bouton sur les pages exemples** | Installez et activez **Dataview**, activez **Enable JavaScript Queries**, passez en **mode Lecture** et conservez tout le dossier `Capture Sample/scripts`. |
| **Message demandant d’activer un module** | Activez ce module dans **Paramètres → Media Capture → Fonctions**, puis rouvrez la page. |
| **Champ d’identifiant absent** | Activez d’abord sa fonction parente ou sélectionnez sa source quotidienne. |
| **Jeton rempli mais requête en échec** | Vérifiez le type exact de jeton (ex. `TMDB API Read Access Token`) et les droits du compte ; enregistrer un champ ne teste pas la connexion. |
| **Informations média indisponibles** | Vérifiez qu’il s’agit d’un lien d’épisode (paramètre `i` pour Apple Podcasts) ou d’une URL vidéo complète, réessayez ou saisissez le titre manuellement. |
| **Enregistré sans couverture** | L’enregistrement reste valide ; réparez les couvertures plus tard depuis **Maintenance**. |
| **Note enregistrée introuvable** | Vérifiez la prévisualisation de destination et le guide de démarrage ; podcasts et vidéos sont séparés (`Podcasts.md` / `Videos.md`). |
| **Tâche non consignée** | Configurez les **Notes quotidiennes** principales, activez **Journal des tâches**, vérifiez le titre cible et terminez une nouvelle tâche Markdown ordinaire. |
| **Sources quotidiennes absentes** | Activez les sources, renseignez leurs identifiants et insérez le modèle **Templater** compatible dans une note vide. |
| **Anciennes notes inchangées** | Les modèles s’appliquent aux nouvelles notes ; utilisez l’aperçu **Maintenance** pour actualiser les enregistrements existants. |
| **Erreur JSON ou conflit de synchronisation** | Inspectez le fichier indiqué dans l’erreur, corrigez les données ou le conflit, rechargez Obsidian puis réessayez. |

## Bon à savoir

> [!WARNING]
> - **Études** cible uniquement la date **du jour** dans le fuseau choisi — ne l’utilisez pas pour remplir un jour passé.
> - **Session Douban expirée :** reconnectez-vous depuis le plugin Douban.
> - **Zones synchronisées gérées :** placez vos notes personnelles hors des blocs gérés.

> [!TIP]
> Avant d’appliquer une actualisation de modèle sur des fichiers existants, vérifiez l’aperçu et la sélection ; l’opération crée automatiquement des sauvegardes. Les erreurs d’un service distant peuvent conserver sa langue d’origine.

## Signaler un problème

Lors de l’ouverture d’un ticket sur [GitHub](https://github.com/Ch1llNoodle/obsidian-media-capture/issues), indiquez :

- Votre **version d’Obsidian** et votre **version de Media Capture**
- La plateforme (**ordinateur** ou **mobile**)
- Les étapes suivies et le message d’erreur visible

> [!CAUTION]
> Retirez toujours clés API, jetons, cookies de connexion et contenus privés avant de partager des journaux ou captures d’écran.

---

[← Coffre exemple](Sample-vault-fr.md) · [Retour à l’accueil](Home-fr.md)
