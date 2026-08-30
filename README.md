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

## Mettre en ligne

Le dépôt contient un workflow GitHub Actions qui teste, construit et publie le
jeu à chaque poussée. Deux réglages sont à faire une fois, et **seulement à la
main** — le jeton des workflows peut déployer sur Pages, mais pas créer le site :

1. **Rendre le dépôt public** (Réglages → tout en bas → *Change repository
   visibility*). Pages n'est servi depuis un dépôt privé qu'avec un plan payant.
2. **Réglages → Pages → Source : GitHub Actions.**

Le jeu est alors publié sur `https://<compte>.github.io/TCG-INVENTO/`, et c'est
cette adresse qu'il faut ouvrir dans Safari pour l'ajouter à l'écran d'accueil.

## Développement

```bash
npm install
npm run dev       # serveur local, accessible depuis le téléphone du réseau
npm run build     # build de production dans dist/ (+ finalisation du service worker)
npm test          # tests du moteur de règles
npm run verifier  # parcours complet dans un navigateur, avec captures
npm run bundle    # empaquette tout en un seul fichier invento.html

npm run art       # régénère les 158 illustrations
npm run icones    # régénère les icônes d'application
npm run splash    # régénère les écrans de démarrage iOS
```

## Hors ligne

Le service worker met en cache deux ensembles distincts : le *socle*
(HTML, CSS, JS, icônes), versionné à chaque déploiement, et le *média*
(illustrations, polices), conservé d'une version à l'autre. Après le premier
chargement, les 158 illustrations sont préchargées en tâche de fond, si bien
que la collection entière reste consultable sans connexion.

Quand une nouvelle version est déployée, le jeu ne l'installe jamais de
lui-même — il propose un bandeau « Mettre à jour ». Cela évite de recharger
l'application au milieu d'une partie.

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

## Illustrer à la main, sans API

Rien n'oblige à passer par une API : le jeu lit `public/art/<identifiant>.webp`,
d'où que viennent ces fichiers. On peut donc générer les images une à une dans
n'importe quel outil gratuit et les importer ensuite.

```bash
npm run art:fiche      # produit fiche-illustrations.html
npm run art:importer -- --depuis=~/Downloads/invento --dry
npm run art:importer -- --depuis=~/Downloads/invento
```

`npm run art:fiche` produit une page listant les 158 illustrations : pour
chacune, le nom de fichier attendu, l'illustration actuelle en référence de
cadrage, et la requête complète prête à copier. Elle suit l'avancement dans le
stockage local du navigateur.

`npm run art:importer` reprend un dossier de fichiers téléchargés — PNG, JPEG,
WebP, n'importe quelle taille — les recadre en 512 × 384, les encode et les
range sous le bon nom. **Le nom du fichier doit commencer par l'identifiant de
la carte** ; `syl-yggravent.png`, `syl-yggravent (2).jpg` et
`syl-yggravent-v3.webp` conviennent tous, donc aucun renommage manuel n'est
nécessaire. Les fichiers non appariés sont signalés sans être importés.

## Remplacer les illustrations par de la génération IA

Chaque carte porte un champ `artPrompt` décrivant sa scène. `npm run art:ai`
en fait une requête complète — description, ambiance de l'élément, directive de
style commune — l'envoie au fournisseur choisi, puis recadre et encode au même
format que le rendu procédural.

**La cohérence d'un set ne vient pas du modèle** mais de la directive de style
partagée et de la graine déterministe. C'est ce qui évite que la carte 3 et la
carte 140 semblent venir de deux jeux différents.

### Choisir un fournisseur

| Fournisseur | Variable | Coût des 158 cartes | Pour qui |
|---|---|---|---|
| `replicate` (défaut) | `REPLICATE_API_TOKEN` | ~0,50 € en Flux Schnell, ~6 € en Flux 1.1 Pro | Le meilleur rapport qualité/prix. À commencer par là. |
| `openai` | `OPENAI_API_KEY` | ~6 € en qualité moyenne | La meilleure obéissance à une description longue et précise. |
| `fal` | `FAL_KEY` | ~0,50 € | Équivalent à Replicate, plus rapide. |
| `local` | `SD_URL` | gratuit | Automatic1111 ou Forge lancé avec `--api`. Seule voie pour imposer un style par LoRA. |

Midjourney donnerait le plus beau résultat mais n'expose pas d'API publique :
il n'est pas automatisable ici.

### Marche à suivre

```bash
# 1. Lire les requêtes sans rien dépenser
npm run art:ai -- --dry --limit=5

# 2. Essayer six cartes pour juger du style
export REPLICATE_API_TOKEN=...
npm run art:ai -- --provider=replicate --limit=6 --force

# 3. Comparer les styles disponibles sur une seule carte
npm run art:ai -- --only=syl-yggravent --style=aquarelle --force
npm run art:ai -- --only=syl-yggravent --style=huile --force

# 4. Une fois le style choisi, lancer un élément entier
npm run art:ai -- --element=flamme --force

# 5. Puis tout le set
npm run art:ai -- --force
```

Styles disponibles : `tcg` (défaut), `aquarelle`, `huile`, `rendu`.
`--suffixe="..."` remplace entièrement la directive par la vôtre.

Options utiles : `--only=<id>`, `--element=<sylve|flamme|…>`, `--limit=N`,
`--modele=<nom>`, `--parallele=N`, `--force`, `--dry`.

**Revenir en arrière** : les illustrations sont versionnées dans Git, donc
`git checkout -- public/art` restaure l'état précédent, quoi qu'il arrive.

Si une carte sort mal, corrigez son `artPrompt` dans `src/data/cards/` — c'est
une seule ligne — puis relancez avec `--only=<id> --force`.

## Les illustrations

Les 158 images de `public/art/` sont de **vrais fichiers WebP** (1,5 Mo au
total), peints par le générateur procédural de `tools/painter.mjs` : décor en
lavis, sujet cel-shadé à partir d'un champ de distance signée, contour encré.
Le rendu est déterministe — même identifiant de carte, même image.

Pour passer à des illustrations générées par IA, chaque carte porte déjà un
champ `artPrompt` décrivant sa scène : voir `npm run art:ai`.
