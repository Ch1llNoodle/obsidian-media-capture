### Etudes

[[Capture Sample/Start|Choisir une langue]]

#### Préparation

Activez Synchronisation des études et renseignez un jeton Maimemo. Terminez la synchronisation dans Maimemo puis utilisez le bouton. Cet exemple concerne le jour actuel dans Asia/Shanghai.

Résultat: Propriétés new_words, review_words et studied de la note quotidienne exemple du jour.

Les chemins ci-dessus sont relatifs à Capture Sample.

Après synchronisation, la note quotidienne du jour s’ouvre. Vérifiez ses propriétés, puis rouvrez-la pour confirmer leur sauvegarde. Les compteurs sont remplacés par les totaux actuels ; répéter la synchronisation ne les additionne pas. Un total positif définit studied à true ; un total nul conserve sa valeur existante. Un échec préserve les propriétés existantes ; une nouvelle note quotidienne exemple vide peut subsister.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "study", lang: "fr" });
```

[[Capture Sample/fr/Demarrer|Retour au guide]]
