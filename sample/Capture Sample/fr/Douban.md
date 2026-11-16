### Douban

[[Capture Sample/Start|Choisir une langue]]

#### Préparation

Activez Synchronisation Douban. Installez le plugin Douban et connectez-vous. Cet exemple synchronise les livres terminés, en cours et à lire. Une grande collection peut prendre du temps.

Résultat: Zone délimitée ci-dessous. Couvertures dans image. Le texte personnel hors des marqueurs est conservé.

Les chemins ci-dessus sont relatifs à Capture Sample.

```dataviewjs
await dv.view("Capture Sample/scripts/demo", { module: "douban", lang: "fr", path: dv.current().file.path });
```

<!-- douban:start -->

<!-- douban:end -->

### Notes

[[Capture Sample/fr/Demarrer|Retour au guide]]
