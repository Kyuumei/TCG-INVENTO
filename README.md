# INVENTO

Jeu de cartes à collectionner pour mobile, jouable hors ligne sur iPhone.
Inspiré de Magic (terrains, cycle de couleurs), de Pokémon TCG Pocket
(évolutions, boosters, parties courtes) et de Hearthstone (mana croissant,
combat simultané).

## Jouer sur iPhone

1. Ouvrir l'URL du jeu dans **Safari** (pas dans une autre application).
2. Bouton **Partager** → **Sur l'écran d'accueil**.
3. Lancer depuis l'icône : le jeu s'ouvre en plein écran, sans barre de
   navigateur, et fonctionne ensuite **sans connexion**.

## Développement

```bash
npm install
npm run art      # génère les 158 illustrations dans public/art/
npm run dev      # serveur local (accessible depuis le téléphone du réseau)
npm run build    # build de production dans dist/
npm test         # tests du moteur de règles
```

## Le jeu

- **20 points de vie**, decks de **20 cartes**, **3 lignes** par camp,
  partie de 5 à 8 minutes en portrait, jouable au pouce.
- **Cristaux** : +1 par tour (maximum 8), rechargés à chaque tour. Pas de
  malchance de terrain.
- **Terrain personnel** choisi avec le deck : bonus passif permanent plus un
  pouvoir activable une fois par tour.
- **Cartes Zone** : posées sur le champ partagé, elles profitent aux deux
  camps — les jouer au mauvais moment renforce l'adversaire.
- **Lignes** : une créature affronte celle qui lui fait face ; si la ligne est
  vide, elle frappe le joueur. Les deux se blessent simultanément.
- **Cycle élémentaire** (faiblesse +50 %, résistance −1) :
  Flamme → Sylve → Roc → Foudre → Marée → Ombre → Flamme.
- **Évolutions** en trois stades : l'évolution conserve les blessures, en
  referme 2, et peut attaquer immédiatement.

## Contenu

151 cartes (6 éléments × 22 + 19 neutres), 7 terrains, 6 decks préconstruits,
8 adversaires de campagne, boosters, constructeur de decks, collection.

## Architecture

```
src/engine/    moteur de règles pur, sans DOM (types, règles, IA, aléatoire)
src/data/      les 151 cartes, terrains, decks, campagne
src/ui/        rendu des cartes, écrans, feuille de style
src/save/      profil, collection et progression (stockage local)
tools/         générateur d'illustrations, icônes, vérification navigateur
tests/         tests du moteur (parties IA contre IA complètes)
```

Le moteur est **pur** : `applyAction(état, action)` renvoie un nouvel état et
un journal d'événements que l'interface rejoue en animations. Tout le hasard
passe par une graine, donc les parties sont reproductibles et testables.

## Les illustrations

Les 158 images de `public/art/` sont de **vrais fichiers WebP** (1,5 Mo au
total), peints par le générateur procédural de `tools/painter.mjs` : décor en
lavis, sujet cel-shadé à partir d'un champ de distance signée, contour encré.
Le rendu est déterministe — même identifiant de carte, même image.

Pour passer à des illustrations générées par IA, chaque carte porte déjà un
champ `artPrompt` décrivant sa scène : voir `npm run art:ai`.
