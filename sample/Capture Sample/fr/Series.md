### Series

[[Capture Sample/Start|Choisir une langue]]

#### Préparation

Activez Suivi des séries et renseignez le jeton TMDB API Read Access Token dans les connexions. Recherchez une série, choisissez une saison puis cochez les épisodes. Cocher inclut les épisodes précédents non vus ; décocher ne touche que cet épisode.

Résultat: data/series.json. Rouvrir la page recharge les saisons et la progression.

Les chemins ci-dessus sont relatifs à Capture Sample.

La sauvegarde crée aussi la note quotidienne exemple du jour dans Capture Sample/daily comme cible datée. La liste interactive des épisodes reste sur cette page ; rouvrez-la pour vérifier la progression sauvegardée.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "series", lang: "fr" });
```

[[Capture Sample/fr/Demarrer|Retour au guide]]
