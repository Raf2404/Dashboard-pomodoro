# Révisions · Léa

Un espace de révision tout-en-un, doux et élégant : minuteur Pomodoro, tâches, flashcards, actualité juridique, musique et un petit compagnon qui grandit avec le travail.

Application web **statique** : aucun serveur, aucune installation, aucun compte. Tout est sauvegardé dans le navigateur.

## Widgets

| | Widget | Ce qu'il fait |
|---|---|---|
| ⏱ | **Focus** | Pomodoro avec une orbe « liquide » qui se remplit pendant le travail. Durées réglables, enchaînement automatique, son doux, notifications. `Espace` lance / met en pause. |
| 🐰 | **Mochi** | Un compagnon qui éclot puis évolue (œuf → bébé → petite → étudiante → avocate) grâce aux sessions, tâches et cartes. On le nourrit avec des macarons gagnés en finissant des sessions, on lui fait des câlins. Il lit pendant le focus et dort la nuit. |
| 💿 | **Vinyle** | Platine connectée à YouTube : colle n'importe quel lien (vidéo, live, playlist). Le disque tourne et le bras se pose pendant la lecture. Ambiances générées (pluie, vagues, feu, bruit doux) à superposer. |
| 📰 | **Actu juridique** | Flux RSS (Le Monde Justice, Franceinfo, Village de la Justice, Actu-Juridique). Ajoute ou retire des sources dans les réglages. |
| ✓ | **À faire** | Tâches avec pastilles de couleur, glisser-déposer, double-clic pour modifier. |
| 🃏 | **Cartes** | Flashcards par paquet avec répétition espacée (boîtes de Leitner). Import rapide : une carte par ligne `question ; réponse`. |
| ⚖ | **Outils** | Recherche directe (Légifrance, Judilibre, EUR-Lex, Cairn, Scholar) et raccourcis vers les sites utiles, personnalisables. |
| 📅 | **Partiels** | Compte à rebours « J-12 » jusqu'aux prochains examens. |
| 🖼 | **Souvenir** | Photos en polaroïd, plein cadre ou médaillon, en diaporama. |
| 📝 | **Notes** | Bloc-notes sauvegardé automatiquement (option écriture manuscrite). |
| ❝ | **Adage** | Un adage latin par jour, la traduction apparaît au survol. |
| 📈 | **Progrès** | Temps de focus du jour, objectif, semaine en barres, série de jours. |

## Personnalisation

- **Palette** (icône en haut à droite) : 6 couleurs, mode jour / nuit, 8 fonds animés ou ta propre photo (fichier ou lien), flou et voile du fond, intensité du verre, 3 typographies, prénom.
- **Organiser** (icône grille) : déplace les widgets, change leur taille, masque ceux qui ne servent pas. « + Widgets » pour les réafficher.
- **Mode focus** (icône cible ou touche `F`) : ne garde que le minuteur, Mochi et le vinyle.
- **Sauvegarde** : export / import d'un fichier JSON pour changer d'ordinateur.

## Mise en ligne (GitHub Pages)

1. Fusionner cette branche dans `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, choisir `main` et `/ (root)`.
3. L'app est disponible à l'adresse `https://<utilisateur>.github.io/<dépôt>/` après une minute.

Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une vraie app (icône, plein écran, fonctionne hors ligne sauf musique et actu).

En local : `python3 -m http.server` dans le dossier puis ouvrir `http://localhost:8000` (ouvrir `index.html` directement marche aussi, mais YouTube préfère une vraie adresse).

## Notes techniques

- HTML / CSS / JavaScript sans framework ni étape de build. Seule dépendance : [SortableJS](https://github.com/SortableJS/Sortable) (incluse dans `vendor/`).
- Données dans `localStorage`, images dans IndexedDB : rien ne quitte le navigateur.
- Les flux RSS passent par des relais publics (rss2json, allorigins, corsproxy) car les sites d'actualité bloquent les lectures directes depuis un navigateur. Si l'un d'eux tombe, le suivant prend le relais, et les derniers articles restent en cache.
- Les sons (cloche, ambiances) sont générés avec la Web Audio API, aucun fichier audio.

```
index.html            page
css/style.css         design (verre liquide, thèmes, animations)
js/core.js            stockage, fenêtres, effets, sons
js/app.js             grille, organisation, personnalisation
js/widgets/*.js       un fichier par widget
sw.js                 hors ligne
```

---

<p align="center"><i>Je t’aime Léa ❤️</i></p>
