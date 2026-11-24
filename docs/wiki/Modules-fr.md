> [English](Modules.md) · [简体中文](Modules-zh-CN.md) · **Français**

Dans **Paramètres → Media Capture → Fonctions**, activez uniquement les modules dont vous avez besoin. Le guide d’aide intégré détaille préparation, actions et résultats, tandis que les paramètres restent centrés sur les interrupteurs et réglages.

> [!NOTE]
> Désactiver un module conserve ses paramètres et données existantes tout en bloquant de nouvelles opérations d’enregistrement.

## Vue d’ensemble des modules

| Module | Point d’entrée | Prérequis |
| --- | --- | --- |
| **Capture de médias** | Icône du ruban ou commande **Capturer un média** | Lien de partage (sans clé) |
| **Journal des tâches** | Cocher une tâche Markdown ordinaire | **Notes quotidiennes** principales + titre de section |
| **Séries** | Page associée | Jeton `TMDB API Read Access Token` |
| **Lecture** | Page associée | Livre et pages (sans clé) |
| **Lieux** | Page associée | Clé Amap Web Service |
| **Études** | Bouton associé | Jeton Open API Maimemo |
| **Sport** | Page associée | Identifiant vidéo et groupes musculaires (sans clé) |
| **Douban** | Bouton de synchronisation associé | Plugin Douban installé et connecté |
| **Sources quotidiennes** | Nouvelle note créée depuis un modèle compatible | Sources choisies + identifiants requis |

## Pages associées

Media Capture fournit les opérations d’enregistrement ; votre coffre fournit les pages interactives et l’affichage.

> [!IMPORTANT]
> Activer un interrupteur ou renseigner un jeton ne crée **pas** automatiquement une bibliothèque, une carte ou un modèle quotidien. Copiez les pages minimales du [Coffre exemple](Sample-vault-fr.md) pour essayer les modules sans écrire de code.

### Comportements spécifiques

- **Séries :** cocher un épisode marque automatiquement les épisodes précédents non vus ; décocher n’affecte que cet épisode.
- **Lecture :** conserve indépendamment la plage de pages de chaque journée.
- **Études :** cible toujours la date du jour selon le fuseau horaire de la page (`Asia/Shanghai` dans les exemples).

## Sources quotidiennes

Localisation, météo, phase lunaire, message et poésie sont activables indépendamment et désactivés par défaut :

- **Phase lunaire sans clé :** utilise `wttr.in` sans identifiant.
- **Repli propre :** une source désactivée ou en échec ne renvoie aucun contenu afin que le modèle utilise sa valeur par défaut.
- **Non destructif :** activer une source ne réécrit jamais les anciennes notes quotidiennes.

---

[← Modes d’enregistrement](Save-layouts-fr.md) · [Identifiants des services →](Service-connections-fr.md)
