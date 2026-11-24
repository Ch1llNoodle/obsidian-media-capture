> [English](Save-layouts.md) · [简体中文](Save-layouts-zh-CN.md) · **Français**

Ouvrez **Paramètres → Media Capture → Fonctions → Capture de médias → Réglages de la fonction**, choisissez un préréglage puis appliquez-le.

> [!NOTE]
> Appliquer un préréglage remplace uniquement la configuration des règles : vos notes existantes ne sont ni déplacées ni supprimées.

## Préréglages intégrés

| Mode | Destination par défaut | Résultat |
| --- | --- | --- |
| **Journal** | `Podcasts.md` / `Videos.md` | Une ligne par élément dans une liste partagée |
| **Une note par élément** | `Media/{{show}}/{{title}}.md` | Une note individuelle par épisode ou vidéo |
| **Journal et note** | Les deux destinations ci-dessus | Une entrée de journal plus une note individuelle |
| **Ajout par émission** | `Media/{{show}}.md` | Épisodes regroupés par émission ou chaîne |

Le formulaire utilise vos règles activées par défaut. Choisir un autre préréglage dans le formulaire s’applique **uniquement à cette capture**. La prévisualisation en bas du formulaire fait foi pour la destination exacte.

## Personnaliser les règles

Ouvrez l’éditeur d’une règle pour ajuster son dossier, son chemin, sa section ou son modèle :

- **Dossier :** laissez vide pour cibler la racine du coffre.
- **Fichier modèle :** laissez vide pour utiliser le modèle intégré. Les modèles Markdown sont rendus en texte brut : leurs scripts ne sont pas exécutés.
- **Émission manquante :** utilise `Unsorted` par défaut.
- **Chemins relatifs :** tous les chemins sont relatifs à la racine du coffre.

## Contraintes importantes

- **Titres d’ajout :** un fichier existant ciblé par ajout doit déjà contenir le titre configuré, sauf si ce titre est vide (ajout en fin de fichier).
- **Changement de chemin :** ne s’applique qu’aux nouvelles captures ; les notes existantes restent en place.
- **Pas de cible en double :** deux règles activées ne peuvent pas écrire dans le même fichier lors d’une même capture.

## Intégration quotidienne

L’intégration quotidienne est facultative et lie les éléments terminés à une note datée existante. Elle ne crée pas de tableau de suivi complet : pour des pages interactives prêtes à l’emploi, utilisez le [Coffre exemple](Sample-vault-fr.md).

---

[← Premier enregistrement](Getting-started-fr.md) · [Modules →](Modules-fr.md)
