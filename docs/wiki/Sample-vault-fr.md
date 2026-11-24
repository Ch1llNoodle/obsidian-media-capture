> [English](Sample-vault.md) · [简体中文](Sample-vault-zh-CN.md) · **Français**

Le coffre exemple fournit des pages interactives et modèles prêts à l’emploi pour tester chaque module sans écrire de code.

## Installation

1. Ouvrez le [dépôt source](https://github.com/Ch1llNoodle/obsidian-media-capture), choisissez **Code → Download ZIP**, extrayez l’archive puis ouvrez `sample`.
2. Copiez tout le dossier `Capture Sample` à la racine de votre coffre Obsidian en conservant son nom, `scripts/demo.js` et `scripts/strings.json`.
3. Ouvrez `Capture Sample/Start.md` et choisissez **Français**, **English** ou **简体中文**. Chaque langue inclut instructions, contrôles interactifs, messages d’état et modèles quotidiens.
4. Activez les modules indiqués sur les pages que vous souhaitez essayer et renseignez uniquement leurs identifiants.

## Dépendances des plugins

| Fonction | Plugins et réglages requis |
| --- | --- |
| **Capture de médias** | Media Capture uniquement |
| **Journal des tâches** | Media Capture + **Notes quotidiennes** principales |
| **Suivis interactifs** (lecture, séries, lieux, études, sport, Douban) | Media Capture + **Dataview** avec **Enable JavaScript Queries** activé (ouvrir en **mode Lecture**) |
| **Modèles de sources quotidiennes** | Media Capture + **Templater** |

## Essayer hors ligne d’abord

- **Lecture :** ouvrez l’exemple Lecture, saisissez un livre et une date, chargez la progression, indiquez les pages et enregistrez. Rechargez le même livre pour vérifier.
- **Sport :** saisissez un identifiant vidéo, sélectionnez les groupes musculaires sur le schéma corporel, enregistrez puis rechargez.

> [!TIP]
> Ni **Lecture** ni **Sport** ne nécessitent de clé de service externe.

### Autres pages exemples

- **Séries :** recherche de séries, choix de saison et cases à cocher.
- **Lieux :** recherche et écriture de liens de visite.
- **Études :** enregistrement des mots du jour.
- **Douban :** démonstration de synchronisation des collections de livres uniquement.
- **Sources quotidiennes :** guide d’insertion du modèle Templater dans une note datée vide.

## Structure des dossiers et données

```text
Capture Sample/
├── Start.md       # Sélecteur de langue et point d’entrée
├── data/          # Fichiers JSON des suivis
├── daily/         # Notes quotidiennes générées
├── places/        # Notes de lieux
├── image/         # Couvertures téléchargées
└── scripts/       # Fichiers requis demo.js et strings.json
```

- La capture de médias et le journal des tâches conservent vos réglages existants du plugin et des **Notes quotidiennes** principales.
- Les dates exemples utilisent le fuseau `Asia/Shanghai`.

## Langues et confidentialité

- **Continuité multilingue :** changer de langue met à jour contrôles, aide et modèles tout en gardant les identifiants stables (livre, vidéo, muscles), ce qui permet de recharger les mêmes choix dans une autre langue.
- **Aucune traduction automatique :** les titres et la météo des services, ainsi que vos propres noms et contenus, ne sont jamais traduits automatiquement.
- **Actions explicites uniquement :** ouvrir une page exemple lit uniquement les données locales — aucun import de réglages, création de fichier ni requête réseau tant que vous ne cliquez pas sur enregistrer/rechercher/synchroniser ou n’insérez pas un modèle.

---

[← Identifiants des services](Service-connections-fr.md) · [Dépannage →](Troubleshooting-fr.md)
