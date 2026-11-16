### Media Capture

**[Guide d’utilisation (Wiki)](https://github.com/Ch1llNoodle/obsidian-media-capture/wiki/Home-fr)** · [Source du guide](docs/wiki/Home-fr.md) · [Exemples multilingues](sample/README.md)

[简体中文](README.zh-CN.md) · [English](README.md) · Français

Media Capture enregistre en Markdown les informations des podcasts Douban, Xiaoyuzhou et Apple Podcasts, ainsi que des vidéos YouTube et Bilibili. Les règles d’écriture permettent de créer un journal avec une ligne par média, des notes séparées ou un fichier par émission ou chaîne. Par défaut, les podcasts et les vidéos utilisent deux journaux distincts. L’interface existe en chinois simplifié, en anglais et en français et suit la langue de l’application.

Les liens quotidiens, associations et lecture sont facultatifs. Capture gère les services et les enregistrements ; le coffre gère les interfaces et la présentation.

| Géré par Capture | Géré par le coffre |
| --- | --- |
| Capture de médias, règles d’écriture, couvertures et associations | Présentation du journal et classement des activités |
| Services, validation, sauvegarde et identifiants | Champs, chemins, prompts et interfaces |
| Notes de lieux et liens quotidiens facultatifs | Cartes, synthèses et calendriers |

#### Installation

Sur iPhone ou ordinateur, installez [BRAT](https://github.com/TfTHacker/obsidian42-brat) depuis les plugins communautaires d’Obsidian, puis ajoutez le dépôt `Ch1llNoodle/obsidian-media-capture`. Choisissez une version publiée ou une préversion et activez Media Capture. BRAT installe et met à jour les fichiers dans Obsidian.

Obsidian 1.8.7 ou ultérieur est requis. Pour une installation manuelle, téléchargez `main.js`, `manifest.json` et `styles.css` depuis les [versions GitHub](https://github.com/Ch1llNoodle/obsidian-media-capture/releases), placez-les dans `<Coffre>/.obsidian/plugins/media-capture/`, puis activez Media Capture dans les paramètres des plugins communautaires. Une compilation du code source produit ces fichiers dans `release/media-capture/`.

Lors d’une mise à jour, remplacez les trois fichiers d’exécution et rechargez le plugin. Conservez `data.json`, qui contient les paramètres, et `records.json`, qui contient les enregistrements. L’identifiant et le dossier d’installation du plugin sont `media-capture`. Le code source et `node_modules` restent hors de ce dossier.

#### Première utilisation

Ouvrez le guide via l’icône d’aide près du titre des paramètres, ou depuis la palette de commandes. Utilisez l’icône latérale, collez un lien d’épisode ou de vidéo complète, récupérez les informations, vérifiez la destination sous le formulaire puis choisissez Enregistrer et ouvrir. Par défaut, les fichiers sont Podcasts.md et Videos.md, sans clé API. Les règles personnalisées utilisent les destinations indiquées dans le formulaire.

Le [dossier sample](sample/README.md) contient un dossier Capture Sample complet. Copiez-le à la racine du coffre et ouvrez Start.md pour choisir le français, l’anglais ou le chinois. Chaque exemple indique dépendances, modules, identifiants, actions et emplacements. Pages, contrôles, messages et modèles utilisent la langue choisie. Les suivis interactifs utilisent Dataview et le modèle quotidien utilise Templater. La capture de médias ne nécessite aucun des deux.

Le guide d’aide indique les prérequis, les actions et les résultats de chaque fonction. Les suivis et les sources quotidiennes nécessitent des pages ou modèles associés ; les activer ou saisir les identifiants ne crée pas ces pages. Les exemples fournissent des pages minimales utilisables. Leurs données restent dans Capture Sample ; les médias et tâches suivent les réglages existants.

#### Journal des tâches terminées

Activez **Journal des tâches terminées** dans **Fonctions** dans les paramètres de Capture pour inscrire les tâches Markdown terminées dans la note quotidienne du jour. Cette fonction est désactivée par défaut. **Titre de la section des tâches** définit la section de destination, `## Notes` par défaut. Le chemin, le format de date et le modèle suivent la configuration des notes quotidiennes d’Obsidian.

Chaque entrée contient le texte de la tâche, un lien vers la tâche d’origine et son heure de fin. Un identifiant de bloc stable est ajouté à la tâche source. Une tâche cochée depuis une vue de synthèse conserve ce lien source. Décocher conserve l’entrée ; terminer à nouveau la tâche actualise l’heure et déplace l’entrée dans la note du jour. Tasks continue de gérer les échéances et les dates de fin. Les tâches déjà terminées ne sont pas rejouées au démarrage. Les entrées sont enregistrées en Markdown, sans fichier de récompenses.

#### Capturer un média

1. Dans la palette de commandes, lancez **Media Capture: Capturer un média**.
2. Collez un lien de partage de podcast ou de vidéo et choisissez **Récupérer les informations**.
3. Vérifiez l’émission ou la chaîne, le titre, la date de suivi, le statut et le préréglage de sortie, puis choisissez **Enregistrer**.

Les podcasts affichent **Écouté**, **En cours d’écoute** et **À écouter**. Les vidéos affichent **Vu**, **En cours de visionnage** et **À regarder**. Les identifiants stockés restent `completed`, `in-progress` et `wishlist` dans toutes les langues, y compris dans `{{state}}`. Les médias terminés reçoivent la date choisie. Si l’intégration au journal est activée, ouvrir la fenêtre depuis une note quotidienne du dossier configuré reprend la date de cette note.

Pour Apple Podcasts, partagez un épisode : une adresse d’émission sans paramètre `i` est refusée. Si les informations ne sont pas disponibles, saisissez le titre manuellement. Un échec de téléchargement de couverture n’empêche pas l’enregistrement.

**Ouvrir le journal des médias** ouvre le journal configuré. **Compléter les couvertures manquantes** réessaie les téléchargements et indique l’étape en échec ; lorsque l’adresse d’image est connue, le rapport permet d’ouvrir l’original.

#### Vidéos et lecture facultative

Les vidéos utilisent `Videos.md` par défaut, ou un autre chemin configuré. Les journaux vidéo et podcast partagent le modèle de ligne et le titre de section. Les notes indépendantes et les fichiers par émission ou chaîne utilisent leurs propres règles.

Les liens YouTube watch, shorts, live, embed et youtu.be sont reconnus, ainsi que les liens Bilibili complets avec un identifiant BV ou av. Chaque partie Bilibili reste un enregistrement distinct. Ouvrez les liens courts pour copier l’adresse complète. Les paramètres de suivi et les positions de lecture sont supprimés. Les informations manquantes peuvent être saisies manuellement.

**Lire dans Obsidian** est désactivé par défaut. Configurez un lecteur compatible avec `obsidian://mx-open`, puis activez l’option. Les lignes vidéo disposent alors d’une action de lecture, et les modèles peuvent utiliser `{{mediaLink}}` et `{{mediaUrl}}`. Lorsque l’option est désactivée, ces variables restent vides pour les nouveaux contenus ou ceux explicitement régénérés ; le lien de plateforme est conservé. Les pages de podcasts ne reçoivent pas de lien de lecture. Le lecteur externe gère la lecture et les positions. Bilibili nécessite un environnement de lecture Web sur ordinateur ; la lecture et la capture vidéo sur mobile restent à vérifier sur appareil.

#### Modèles et règles d’écriture

Chaque règle définit un modèle, un chemin relatif au coffre et un mode : **Ajouter au fichier** ou **Créer un fichier**. Plusieurs règles activées peuvent s’exécuter pour une capture, avec un seul téléchargement de couverture et un seul lien vers le journal quotidien.

| Préréglage | Destination | Contenu |
| --- | --- | --- |
| Journal | Section Entries de `Podcasts.md` ou `Videos.md` | Une ligne de liste |
| Une note par élément | `Media/{{show}}/{{title}}.md` | Une note indépendante |
| Journal et notes séparées | Les deux sorties précédentes | Une ligne et une note |
| Ajouter par émission / chaîne | Section Entries de `Media/{{show}}.md` | Plusieurs épisodes dans un fichier |

Les paramètres permettent de modifier le nom, l’activation, le mode, le dossier, le chemin, le titre cible, le fichier modèle, le contenu intégré et la largeur de couverture. Jusqu’à 20 règles sont acceptées. Appliquer un préréglage remplace la configuration des règles et conserve les fichiers existants. Dans la fenêtre de capture, **Utiliser les règles activées** utilise la configuration courante ; choisir un autre préréglage ne concerne que cette capture.

Un chemin fixe rassemble les épisodes dans un fichier ; `{{show}}.md` les regroupe par émission ; `{{show}}/{{title}}.md` avec le mode création produit une note par épisode. Un dossier vide désigne la racine du coffre. Une émission absente utilise Unsorted. Les caractères de nom de fichier non pris en charge sont remplacés. En mode création, une note déjà identifiée est rouverte ; un fichier étranger occupant le chemin entraîne l’ajout d’un suffixe d’identification. En mode ajout, le fichier est réutilisé ou créé s’il est absent ; un fichier existant doit contenir le titre configuré, sauf si celui-ci est vide. Deux règles visant le même fichier sont refusées avant écriture.

La règle du journal conserve un chemin fixe, un titre et une liste sur une ligne contenant `{{link}}`, afin de préserver les liens quotidiens et les associations. Les autres règles d’ajout acceptent plusieurs lignes. Les commentaires `media-entry` délimitent les zones gérées : conservez-les ainsi que les identifiants de bloc, et placez le texte personnel en dehors. L’aperçu en direct masque ces marqueurs dans les sorties suivies. Une capture répétée conserve une zone déjà terminée ; un changement de statut s’arrête si cette zone a été modifiée manuellement.

Choisissez un fichier Markdown du coffre ou laissez le champ vide pour utiliser le contenu intégré. Les modèles de création peuvent inclure des propriétés YAML ; les modèles d’ajout utilisent le corps du texte. Les modèles sont rendus comme du texte et leurs scripts ne sont pas exécutés.

| Variable | Valeur |
| --- | --- |
| `{{show}}`, `{{title}}` | Émission et titre de l’épisode |
| `{{fullTitle}}`, `{{link}}` | Texte « émission · titre » ou lien Markdown correspondant |
| `{{mediaLink}}`, `{{mediaUrl}}` | Lien ou URI de lecture vidéo, vide si désactivé ou pour une page de podcast |
| `{{kind}}`, `{{consumed}}` | `video` ou `podcast`, et date de fin choisie |
| `{{url}}` | Adresse canonique du média |
| `{{cover}}`, `{{coverPath}}` | Image Markdown locale à la largeur de la règle, ou son chemin ; vide sans couverture |
| `{{published}}` | Date de publication fournie par la plateforme |
| `{{listened}}` | Date de fin choisie, vide pour les autres statuts |
| `{{currentDate}}`, `{{date}}` | Date locale de la première création, conservée lors des mises à jour |
| `{{description}}` | Description fournie par la plateforme ou saisie manuellement |
| `{{state}}`, `{{provider}}`, `{{id}}` | Statut stocké, plateforme et identifiant stable |

Les dates acceptent YYYY, MM et DD, par exemple `{{published:YYYY-MM-DD}}`. Les chemins acceptent show, title, published, listened, currentDate, date, provider et id, avec des barres obliques entre les sous-dossiers. Les informations facultatives absentes restent vides dans le contenu et utilisent Untitled dans les noms de fichiers. La largeur de couverture va de 16 à 600 pixels ; les préréglages utilisent 24 pour les lignes et 120 pour les notes.

Une ligne peut utiliser `- {{listened}} {{cover}} {{link}}`. Exemple de modèle de création :

```markdown
---
show: "{{show}}"
published: "{{published}}"
listened: "{{listened}}"
tags: [podcast]
---
### {{title}}

{{cover}}

[Épisode](<{{url}}>)

#### Notes

#### Quotes
```

**Créer une note de média** ouvre le préréglage de note indépendante. **Écrire une note** à côté d’une ligne présélectionne l’épisode ; **Ouvrir la note** retrouve sa note principale. Le journal conserve aussi un lien vers la première sortie supplémentaire, y compris l’épisode d’un fichier d’émission. Ces actions sont disponibles en lecture et dans l’éditeur. Les associations et les outils de suivi fondés sur le journal utilisent la règle de journal ; les sorties arbitraires ne sont pas automatiquement intégrées aux statistiques externes.

Chaque fichier créé contient `media_capture_id` et `media_capture_rule`. Les index utilisent `ruleId::recordId` et suivent les renommages des fichiers d’ajout. Si un fichier suivi ou sa zone disparaît, l’enregistrement signale la cible manquante sans la recréer ailleurs. Synchronisez `data.json` et `records.json` avec le coffre.

#### Appliquer les modèles aux enregistrements existants

Les modifications de modèle s’appliquent aux nouveaux enregistrements par défaut. Utilisez **Appliquer les modèles aux enregistrements existants → Prévisualiser et choisir**, ou la commande correspondante, pour sélectionner des mises à jour.

Les règles de création régénèrent le fichier entier, propriétés et texte personnel compris. Les règles d’ajout remplacent uniquement les lignes ou zones gérées, en conservant le texte extérieur, les œuvres associées et les citations. Un fichier d’émission regroupant plusieurs épisodes est mis à jour et sauvegardé une seule fois. Les noms et emplacements restent inchangés.

Avant remplacement, une sauvegarde complète horodatée avec l’extension `.media-capture-backup` est enregistrée et vérifiée à côté du fichier. **Afficher la sauvegarde** montre son texte dans Obsidian ; recopiez-le dans la note d’origine pour restaurer. Gardez les sauvegardes jusqu’à ce qu’elles ne soient plus nécessaires.

La mise à jour nécessite les métadonnées capturées ; les propriétés explicites de la note peuvent les remplacer. Les anciennes notes ne sont pas reconstituées à partir de liens ou de titres. L’aperçu indique les champs facultatifs absents. Les métadonnées essentielles manquantes, identifiants dupliqués, règles supprimées et marqueurs endommagés produisent des erreurs. Aucune requête réseau n’est effectuée.

Le rapport indique le fichier, l’étape, la cause, le résultat et la sauvegarde. Les fichiers modifiés après l’aperçu sont ignorés. Un échec de sauvegarde empêche le remplacement ; les autres fichiers peuvent continuer. Un contenu identique ne crée pas de nouvelle sauvegarde. Fermer la fenêtre n’annule pas une mise à jour déjà lancée.

#### Associer des œuvres aux médias

Marquez une œuvre comme souhaitée sur Douban, puis importez-la dans une collection Markdown avec votre outil de synchronisation. Configurez les six chemins pour les livres, films, séries, musique, jeux et théâtre. Les chemins par défaut sont dans `Recommendations/` ; Capture lit les fichiers existants.

Dans un journal de médias, choisissez **Ajouter une association**, sélectionnez une œuvre souhaitée, saisissez un extrait facultatif et choisissez **Enregistrer l’association**. Les statuts acceptés sont 想读, 想看, 想听 et 想玩 selon le type. **Ouvrir les associations de médias** ouvre le journal des podcasts ; les lignes vidéo disposent de leur propre action.

L’œuvre reçoit un lien vers le média source ; les liens d’œuvres et les extraits apparaissent sous le podcast ou la vidéo. Les commentaires identifient les liens gérés. L’aperçu en direct masque ces commentaires et les identifiants de bloc, tandis que le mode source les conserve. Les titres, dates, statuts, couvertures et mises en forme personnelles sont préservés. Plusieurs sources partagent une ligne d’œuvre et les sauvegardes répétées sont dédupliquées.

Les associations modifient les collections locales hors ligne. Le média et l’œuvre sont revérifiés avant écriture. Les deux notes sont mises à jour séparément ; si la seconde écriture échoue, la fenêtre indique le côté déjà enregistré. Réenregistrer complète l’autre côté sans doublon. Après le chargement de l’espace de travail, les associations présentes côté œuvre peuvent restaurer les liens manquants sous les médias, y compris pour les œuvres terminées.

Format d’une ligne de collection :

```markdown
- [Titre de l’œuvre](<https://movie.douban.com/subject/123/>) <!-- douban-state: 想看 --> <!-- douban-type: movie --> ^douban-123
```

`douban-type` accepte `book`, `movie`, `teleplay`, `music`, `game` et `theater` ; en son absence, le type de collection configuré est utilisé. L’événement facultatif `media-capture:recommend` reçoit `{ path, blockId }` pour présélectionner une source ; `supportsRecommendations` indique la prise en charge. Un outil de synchronisation doit préserver les informations entre `media-sources:start` et `media-sources:end` lorsqu’il réécrit une œuvre. La synchronisation des collections Douban reste externe.

#### Langue de l’interface

Le chinois simplifié, l’anglais et le français sont disponibles. L’interface suit la langue de l’application ; les codes régionaux sont reconnus. Les autres langues utilisent l’anglais. Rechargez le plugin après un changement de langue pour actualiser les noms de commandes.

Les paramètres, fenêtres, boutons, notifications et erreurs générées par le plugin sont traduits. Les modèles existants, noms de règles, propriétés, noms et valeurs d’identifiants, contenu des notes et statuts stockés restent inchangés. Les erreurs des plateformes et du système conservent leur texte d’origine. Les messages sources servent de clés ; les catalogues anglais et français sont dans `src/locales`, et `src/i18n.ts` gère la langue et la substitution des paramètres.

#### Paramètres

Les paramètres comportent trois pages : Fonctions, Connexions aux services et Maintenance. Activez la capture de médias, les tâches, les séries, la lecture, les lieux, les études, le sport, Douban et les sources quotidiennes selon les besoins. Seuls les modules activés affichent leurs réglages. Une nouvelle installation active uniquement la capture de médias. Ses réglages regroupent règles, lecture, couvertures, liens quotidiens et œuvres associées. La maintenance propose les opérations des modules activés. Les cartes utilisent les couleurs du thème sans bordure extérieure.

Les connexions affichent uniquement les identifiants utilisés par les fonctions activées ; les identifiants partagés apparaissent une seule fois. Désactiver un module masque ses réglages et bloque ses API, tout en conservant paramètres, identifiants et données. Les accès à la lecture, aux séries et aux muscles vérifient chaque opération. Localisation, météo, phase lunaire, message et poésie proposent chacun Désactivé ou une source prise en charge ; ils sont désactivés par défaut. Une source quotidienne désactivée renvoie null afin que le modèle utilise ses valeurs par défaut.

| Paramètre | Valeur par défaut | Fonction |
| --- | --- | --- |
| Règles d’écriture | Journal activé | Préréglages ou règles d’ajout et de création |
| Journal des vidéos | `Videos.md` | Destination séparée partageant le titre et le modèle du journal |
| Lire dans Obsidian | Désactivé | Lecture via un lecteur compatible configuré |
| Dossier des couvertures | `image/media` | Dossier local partagé |
| Enregistrer les couvertures localement | Activé | Téléchargement à la capture ou à la réparation |
| Compléter les couvertures au démarrage | Désactivé | Réparation après le chargement de l’espace de travail |
| Intégration au journal | Désactivée | Lien vers une unique note quotidienne existante |
| Identifiants des services | Vides | Services des modules activés uniquement, identifiants partagés affichés une fois |
| Dossier / propriété du journal | `Daily` / `media` | Recherche dans les sous-dossiers, autres propriétés conservées |
| Collections d’œuvres | `Books.md`, `Movies.md`, `Series.md`, `Music.md`, `Games.md`, `Theater.md` dans `Recommendations/` | Collections d’œuvres souhaitées existantes |

L’intégration au journal recherche une note nommée `YYYY-MM-DD` dans le dossier configuré et ses sous-dossiers. Elle utilise le lien de bloc du journal si la règle correspondante s’exécute ; sinon, elle utilise la première sortie supplémentaire, avec une ancre d’épisode pour les fichiers d’émission. Créer une note depuis une ligne existante conserve la source d’activité d’origine. Modifier les chemins concerne les nouvelles sorties ; les fichiers existants restent à leur place.

#### Identifiants des services

Saisissez les identifiants par nom de service. Les champs sont masqués et disposent d’un bouton pour les afficher. Les séries utilisent TMDB, les études Maimemo et les lieux Amap. Les sources quotidiennes peuvent utiliser Tencent Maps, Amap, DeepSeek et Jinrishici. La phase lunaire wttr.in ne nécessite aucun identifiant. La configuration utilise `modules` et `dailySources`, et les tâches `modules.tasks`. L’ancien champ `taskCompletionLog` est refusé, sans migration des anciennes configurations.

#### Identité des enregistrements et couvertures

Les couvertures portent le nom de l’émission, ou le titre du média si celui-ci manque ; les vidéos utilisent leur titre. Les caractères invalides deviennent des traits de soulignement et des images différentes portant le même nom reçoivent un suffixe de huit caractères. Les candidats proviennent des journaux configurés et des enregistrements. Des octets identiques partagent un fichier. Pour les podcasts de la même émission normalisée, une comparaison visuelle prudente en 32 × 32 pixels permet aussi de réutiliser une version redimensionnée ou recompressée. Les vidéos utilisent la comparaison d’octets. Une nouvelle capture peut télécharger une image pour la comparer, sans enregistrer de doublon. Les adresses de couverture et rapports de réparation ne sont pas conservés. Les pièces jointes existantes gardent leur nom et leur emplacement.

Un titre générique de lecteur Apple peut être corrigé lors d’une réparation si l’épisode exact est retrouvé. Les titres personnels, dates d’origine, identifiants de bloc et citations sont conservés. Les commentaires media-state, media-date et les identifiants de bloc servent à la déduplication, aux couvertures et aux liens quotidiens : conservez-les lors des modifications manuelles.

Sur une même plateforme, l’identifiant de l’épisode ou de la vidéo sert à retrouver l’enregistrement. Entre plateformes, le texte complet « émission · titre » doit correspondre après normalisation Unicode, des espaces et de la casse. Un média terminé conserve sa première date. Enregistrer une nouvelle écoute ou un nouveau visionnage à une autre date nécessite l’intégration au journal et une seule note existante pour cette date ; les deux dates partagent la ligne et la couverture.

#### API des enregistrements et responsabilités

Capture transforme les informations externes et les actions en enregistrements fiables. Le coffre définit leur organisation et leur présentation. Les scripts utilisent directement `app.plugins.plugins['media-capture'].records`.

| API | Responsabilité |
| --- | --- |
| `services` | Recherche TMDB, saisons et épisodes ; lieux Amap ; données Maimemo avec `tmdbToken`, `amapKey`, `maimemoToken` |
| `reading(path)` | Pages, signets et historique |
| `series(path)` | Épisodes partagés, progression et instantanés quotidiens ; `change(context, action)` gère associations, actualisations et cases cochées |
| `selections(path)` | Listes de chaînes par identifiant stable, notamment les groupes musculaires |
| `metadata(path, change)`, `link`, `moveLink` | Fusion des propriétés, ajout/suppression et ordre des liens |
| `place(folder, place)` | Création ou réutilisation des lieux par identifiant Amap, coordonnées WGS84 et source |
| `syncStudy(path, fields, options)` | Validation et sauvegarde des données du jour ; refus des doublons et changements de date |
| `syncDouban(options, render)` | Pages de collection, classification et couvertures ; rendu du coffre appliqué au texte actuel. Le cookie fourni par le plugin Douban n’est pas conservé |
| `daily()` | Localisation, météo, lune, salutation et poésie validées ; budget commun de 15 secondes par note ; null en cas d’échec ou d’identifiant absent |

Le coffre fournit chemins, champs, fuseaux horaires, titres, prompts et rendu. Les pages, épisodes et sélections restent dans les fichiers JSON indiqués, séparés de data.json et records.json. Les écritures sur un même chemin sont sérialisées dans l’application ; données invalides et conflits externes arrêtent l’écriture. Il ne s’agit pas d’une transaction entre appareils. L’événement `media-capture:record-updated` contient `{path}` ; l’adaptateur du coffre actualise Dataview. Les anciennes interfaces s’arrêtent au déchargement du plugin.

`daily()` utilise `tencentMapKey`, `amapKey`, `deepseekKey` et `jinrishiciToken`. DeepSeek reçoit le prompt du coffre, y compris lieu et météo si fournis. Le modèle gère la sortie et la sauvegarde. Les appels sont déclenchés par l’utilisateur, sans interrogation périodique. Les tests des services sont dans le plugin ; les tests du coffre utilisent `MEDIA_CAPTURE_SOURCE_PATH`, par défaut le dépôt voisin `obsidian-media-capture`.

#### Données et intégration au coffre

Les commentaires `media-state`, les métadonnées capturées, les sorties gérées, les événements et `{{state}}` utilisent les identifiants fixes `completed`, `in-progress` et `wishlist`. Seuls les libellés affichés sont traduits. Les statuts des collections d’œuvres Douban suivent un format distinct et restent inchangés.

Les paramètres utilisent le schéma 3 ; les enregistrements utilisent le schéma 2.

La sortie est du Markdown ordinaire. Les scripts du coffre gèrent les sections quotidiennes, les activités, les synthèses et les styles de fin. Les chemins, modèles, propriétés et événements constituent les points d’intégration.

Après enregistrement, `media-capture:updated` fournit `path`, `blockId`, `state` et `date`. Les captures de notes ajoutent `notePath` et `output` ; `blockId` est vide sans ligne de journal. Le type `CaptureUpdatedEvent` est défini dans `src/types.ts`.

| Fichier installé | Contenu | Usage |
| --- | --- | --- |
| `data.json` | `{schemaVersion: 3, settings}`, identifiants compris | Paramètres locaux |
| `records.json` | Version 2 : index, métadonnées sources et ajouts gérés | Retrouver les sorties, détecter les modifications, appliquer les modèles |

Les liens, images Markdown, identifiants de plateforme et champs de date dérivés sont reconstruits à la lecture. Un contenu inchangé n’est pas réécrit ; les mises à jour des enregistrements passent par un fichier temporaire vérifié. Une nouvelle installation ne crée `records.json` qu’après une capture. Les réponses d’API, données d’apprentissage, progressions et lieux n’y sont pas enregistrés. Synchronisez les deux fichiers avec les notes entre appareils et gardez les identifiants hors des dépôts publics.

#### Partager une configuration

Partagez les règles, les modèles Markdown correspondants et les chemins relatifs nécessaires. Préparez une copie des paramètres sans valeurs d’identifiants et listez les noms de champs attendus par les scripts. Vérifiez le contenu personnel dans les modèles et chemins. Gardez `records.json`, ses index et son historique dans le coffre d’origine. Il n’existe actuellement aucune commande d’import ou d’export de configuration ; copier un modèle nécessite aussi de configurer sa règle et d’installer séparément les scripts du coffre.

#### Organisation du code

`settings.ts` définit les valeurs par défaut, chemins dérivés et validations. `CapturePreferences` représente les préférences partageables ; `CaptureSettingsData` ajoute les identifiants locaux et champs dérivés. Les éditeurs utilisent `SettingsAccess`, indépendamment du service de capture. `core.ts` gère les identités et lignes, `fetch-metadata.ts` les requêtes de métadonnées et `data-store.ts` la persistance. record-api.ts expose les interfaces des enregistrements ; record-store.ts gère les écritures JSON et les conflits. Les modules de services, épisodes, lecture, sources quotidiennes et Douban sont séparés. Les vues et la présentation restent dans le coffre.

#### Développement et vérification

Le code d’exécution est en TypeScript strict, avec vérification des accès indexés, des remplacements explicites et des déclarations inutilisées. ESLint contrôle les usages `any` et les opérations non sûres. Les données externes entrent comme `unknown` avant validation.

`src/main.ts` gère le cycle de vie et les commandes. `capture-output.ts` coordonne la capture et `capture-context.ts` partage la couverture et le lien quotidien. `write-rules.ts` valide les règles, `note-format.ts` rend les variables, `episode-notes.ts` et `append-output.ts` traitent les sorties. `refresh-plan.ts` prépare les mises à jour et `note-refresh.ts` effectue les sauvegardes et remplacements. Les contrats communs sont dans `types.ts`.

```sh
npm ci
npm run typecheck
npm run build
npm test
npm run lint
```

La compilation produit les fichiers dans `release/media-capture/`. Les tests compilent les modules avec esbuild et simulent les API Obsidian, y compris les trois langues. Les contrôles d’intégration facultatifs utilisent `MEDIA_TRACKER_TEST_PATH`, `MEDIA_DOUBAN_SYNC_TEST_PATH` et `MEDIA_WORK_PRESENTATION_TEST_PATH` ; ils sont ignorés si ces chemins ne sont pas fournis. `npm audit` vérifie séparément les dépendances.

Un tag identique aux versions de manifest et package déclenche la compilation, les tests et ESLint. Après réussite, le workflow publie les fichiers d’exécution dans une préversion GitHub utilisable par BRAT. Il ne soumet pas le plugin au catalogue communautaire. Les fichiers générés, dépendances et données personnelles ne sont pas suivis dans le dépôt source.

#### Développement local et déploiement

Séparez le dépôt source du dossier installé. S’il se trouve dans le coffre, excluez-le du dépôt Git extérieur, tout en sauvegardant le plugin installé et ses paramètres. Copiez `.deploy.example.json` vers `.deploy.local.json` et définissez `vaultPath` comme chemin absolu d’un coffre existant.

`npm run deploy` compile et copie les fichiers ; rechargez ensuite le plugin dans Obsidian. `npm run deploy -- --vault /absolute/path/to/vault` permet de choisir un autre coffre. Priorité : argument, variable `MEDIA_CAPTURE_VAULT`, configuration locale.

Le déploiement ne copie que main.js, manifest.json et styles.css si présent, conserve data.json, records.json et les autres fichiers, vérifie l’identifiant et la version, et refuse une destination qui est un dépôt source ou passe par un lien symbolique. La configuration locale et `release/` sont exclus de Git. `npm run dev` recompile sans déployer automatiquement.

#### Réseau et appareils mobiles

Les requêtes utilisent l’API Obsidian. Les scripts personnalisés du coffre peuvent contacter d’autres services.

| Fonction | Destination | Données et authentification |
| --- | --- | --- |
| Informations des podcasts | Pages Douban et Xiaoyuzhou ; `itunes.apple.com` et pages Apple | Identifiants d’épisode ou d’émission et région, sans session de plateforme |
| Informations des vidéos | `www.youtube.com/oembed` et pages publiques Bilibili | Adresse canonique ou identifiant, sans session de plateforme |
| Couvertures | HTTPS sur `doubanio.com`, `xyzcdn.net`, `mzstatic.com`, `ytimg.com`, `hdslb.com` et leurs sous-domaines | Adresse de couverture fournie par les métadonnées |
| TMDB | `api.tmdb.org/3` | Query, series and season IDs; Bearer `tmdbToken` |
| Maimemo | `open.maimemo.com` | Study progress and completed word lists; Bearer `maimemoToken` |
| Amap places/weather | `restapi.amap.com` | Keyword, city and `amapKey` |
| Daily sources | `apis.map.qq.com`, `wttr.in`, `api.deepseek.com`, `v2.jinrishici.com` | IP lookup key; city; prompt and DeepSeek key; poetry token |
| Douban collections | `book.douban.com`, `movie.douban.com`, `music.douban.com`, `doubanio.com` | User ID and login cookie for collection/detail requests; public covers |

Apple renvoie jusqu’à 200 épisodes par émission ; les épisodes plus anciens peuvent nécessiter la page Web ou un titre manuel. Enregistrer un titre manuel peut encore déclencher la recherche d’une couverture manquante. Désactiver le téléchargement arrête les requêtes d’image ; les réparations manuelles ou au démarrage peuvent encore lire des pages de médias. Les associations et la lecture d’identifiants restent locales ; les services intégrés sont accessibles par records.

Le code utilise les API Obsidian et Web, sans dépendance d’exécution Node.js ou Electron. Le manifest autorise Android et iOS ; la compatibilité réelle sur appareils reste à vérifier. Seuls les identifiants saisis explicitement dans les paramètres sont exposés aux scripts. Le plugin ne lit ni les sessions de navigateur ni l’historique de lecture et n’intègre aucune télémétrie. Les erreurs apparaissent dans la vue, la fenêtre de capture ou le rapport concerné.

#### Licence

[Zero-Clause BSD](LICENSE).
