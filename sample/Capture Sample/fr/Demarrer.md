### Exemples Capture

[[Capture Sample/Start|Choisir une langue]]

Copiez tout le dossier Capture Sample à la racine du coffre, conservez son nom et ouvrez cette page. Activez Media Capture au préalable.

#### Premier média

1. Cliquez sur l’icône de capture latérale ou utilisez la commande Media Capture.
2. Collez un lien d’épisode ou de vidéo YouTube/Bilibili complète et récupérez les informations.
3. Vérifiez la destination sous le formulaire et choisissez Enregistrer et ouvrir. Aucune clé API ni Dataview nécessaire pour la capture.

#### Examples

Les exemples interactifs nécessitent Dataview. Installez-le dans Paramètres → Plugins communautaires → Parcourir, activez-le puis autorisez les requêtes JavaScript dans ses réglages. Ouvrez les exemples en mode Lecture. Chaque page indique le module Capture requis. Ne renseignez que les identifiants des fonctions activées. Les modèles quotidiens utilisent Templater.

| Exemple | Préparation | Action |
| --- | --- | --- |
| [[Capture Sample/fr/Lecture\|Lecture]] | Activez Suivi de lecture. Aucun identifiant nécessaire. Saisissez le livre et la date, chargez la progression, indiquez les pages et enregistrez. Un même titre désigne un même livre ; rechargez après un changement. | data/reading.json et la note quotidienne exemple de la date choisie. |
| [[Capture Sample/fr/Series\|Series]] | Activez Suivi des séries et renseignez le jeton TMDB API Read Access Token dans les connexions. Recherchez une série, choisissez une saison puis cochez les épisodes. Cocher inclut les épisodes précédents non vus ; décocher ne touche que cet épisode. | data/series.json. Rouvrir la page recharge les saisons et la progression. |
| [[Capture Sample/fr/Lieux\|Lieux]] | Activez Suivi des lieux et renseignez une clé Amap Web Service. Recherchez un mot-clé et éventuellement une ville, puis choisissez un lieu pour enregistrer la visite du jour. | Notes dans places et propriété places de la note quotidienne exemple du jour. |
| [[Capture Sample/fr/Etudes\|Etudes]] | Activez Synchronisation des études et renseignez un jeton Maimemo. Terminez la synchronisation dans Maimemo puis utilisez le bouton. Cet exemple concerne le jour actuel dans Asia/Shanghai. | Propriétés new_words, review_words et studied de la note quotidienne exemple du jour. |
| [[Capture Sample/fr/Sport\|Sport]] | Activez Suivi sportif. Aucun identifiant nécessaire. Saisissez un lien ou un nom stable, chargez les choix, sélectionnez les groupes musculaires puis enregistrez. | data/exercise.json. Les identifiants musculaires sont communs aux langues ; cet exemple ne contient pas de schéma corporel. |
| [[Capture Sample/fr/Douban\|Douban]] | Activez Synchronisation Douban. Installez le plugin Douban et connectez-vous. Cet exemple synchronise les livres terminés, en cours et à lire. Une grande collection peut prendre du temps. | Zone délimitée ci-dessous. Couvertures dans image. Le texte personnel hors des marqueurs est conservé. |

- [[Capture Sample/fr/Tasks|Journal des tâches]]
- [[Capture Sample/fr/Daily-sources|Sources quotidiennes]]

Les données de suivi sont dans Capture Sample/data, les notes quotidiennes dans Capture Sample/daily, les lieux dans Capture Sample/places et les couvertures dans Capture Sample/image. Médias et tâches suivent vos paramètres existants. Les dates utilisent Asia/Shanghai. Les titres et la météo fournis par les services restent dans leur langue d’origine.
