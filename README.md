# Visualiseur et saisie JSON

Application React + TypeScript + Vite pour visualiser, filtrer, corriger et exporter des jeux de données JSON contenant des dates, des coefficients et des hashes SHA-256.

## Fonctionnalités

L’application propose trois espaces de travail : un tableau de bord avec les indicateurs principaux, une vue de saisie avec tableau paginé et une vue statistiques. Les données peuvent être filtrées par année, mois, jour, heure, coefficient, texte libre et type de doublon.

Les enregistrements peuvent être ajoutés ou modifiés manuellement. L’import accepte un tableau JSON depuis un fichier ou le presse-papiers, avec validation des champs `date_brute`, `coefficient` et `hash`. L’export est disponible en JSON et CSV pour l’ensemble des données, la sélection ou le résultat filtré.

Les données sont conservées dans le stockage local du navigateur sous la clé de version `json-dataviewer:records:v1`. Cette persistance est locale à chaque navigateur et ne remplace pas une sauvegarde externe : utilisez l’export JSON pour archiver ou transférer un jeu de données.

## Démarrage local

### Prérequis

- Node.js 22 recommandé, ou une version compatible avec le projet ;
- npm.

### Installation

```bash
git clone https://github.com/natyandry10/jetx-ou-aviatorio.git
cd jetx-ou-aviatorio
npm ci
```

### Développement

```bash
npm run dev
```

L’application est alors disponible sur `http://localhost:3000`.

### Vérification et build de production

```bash
npm run lint
npm run build
npm run preview
```

La commande `lint` effectue le contrôle TypeScript. La commande `build` génère les fichiers statiques dans `dist/`.

## Déploiement

### Vercel

Le dépôt est compatible avec un projet Vercel relié à GitHub. Le framework Vite est détecté automatiquement ; le build utilise `npm run build` et le répertoire de sortie est `dist`. Une fois le dépôt relié, chaque push sur la branche de production peut déclencher un nouveau déploiement.

### GitHub Pages

Un workflow GitHub Actions reste présent dans `.github/workflows/deploy.yml`. Il installe les dépendances avec `npm ci`, exécute `npm run lint`, construit l’application puis publie `dist` sur GitHub Pages.

## Structure principale

```text
src/
├── components/       # Tableau, filtres, modales et vues
├── data/             # Jeu de données initial
├── utils/            # Filtrage, formatage, export et persistance
├── App.tsx           # État global et orchestration
└── types.ts          # Modèle TypeScript des enregistrements
```

## Améliorations intégrées

Cette version ajoute la restauration automatique des données conservées dans le navigateur, des identifiants d’import uniques, une validation stricte des données JSON et une sélection globale compatible avec les filtres actifs. La pagination revient également à la première page lorsqu’un filtre modifie le jeu de résultats, et la CI vérifie désormais le typage avant le build.

## Feuille de route suggérée

Pour les prochaines itérations, les améliorations les plus utiles seraient l’ajout de tests automatisés sur le filtrage et les imports, une sauvegarde optionnelle vers une base de données, un historique annuler/rétablir pour les suppressions, ainsi qu’une analyse de performance sur les fichiers JSON volumineux. Une validation de schéma versionnée et un import par lots seraient également pertinents si les volumes augmentent.

## Licence

Le code source est distribué sous licence Apache-2.0 lorsqu’aucune autre indication ne s’applique.
