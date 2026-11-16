### Modes d’enregistrement

[English](Save-layouts.md) · [简体中文](Save-layouts-zh-CN.md) · [Français](Save-layouts-fr.md)

Ouvrez Fonctions → Capture de médias → Réglages. Choisissez un préréglage puis appliquez-le. Cela remplace la configuration des règles sans déplacer ou supprimer les notes existantes.

| Mode | Destination par défaut | Résultat |
| --- | --- | --- |
| Journal | Podcasts.md / Videos.md | Une ligne par élément |
| Une note par élément | Media/{{show}}/{{title}}.md | Note d’épisode individuelle |
| Journal et note | Les deux destinations | Une ligne et une note |
| Ajout par émission | Media/{{show}}.md | Épisodes regroupés par émission |

Le formulaire utilise normalement les règles activées. Y choisir un autre préréglage ne change que cette capture. Sa prévisualisation indique la destination exacte.

Ouvrez l’éditeur d’une règle pour modifier dossier, chemin, section ou modèle. Un dossier vide désigne la racine du coffre ; sans fichier modèle, le modèle intégré est utilisé. Les modèles Markdown sont du texte : leurs scripts ne sont pas exécutés. Sans nom d’émission, Unsorted est utilisé.

Les chemins sont relatifs au coffre. Un fichier existant ciblé par ajout doit contenir le titre configuré, sauf si ce titre est vide. Changer un chemin concerne les nouvelles sorties, pas les notes déjà enregistrées. Deux règles ne peuvent pas écrire dans le même fichier lors d’une capture.

L’intégration quotidienne est facultative et associe les éléments terminés à une note datée existante. Elle ne crée pas un tableau de suivi complet. Pour les pages associées, utilisez [Coffre exemple](Sample-vault-fr.md).

[Guide Media Capture](Home-fr.md) · [Source](https://github.com/Ch1llNoodle/obsidian-media-capture) · [sample](https://github.com/Ch1llNoodle/obsidian-media-capture/tree/master/sample)
