# 📊 Visualiseur & Saisie JSON (Frosted Glass Edition)

Application moderne et réactive construite avec **React**, **TypeScript**, **Tailwind CSS** et **Vite** pour la visualisation, le filtrage temporel multicritère, la détection des doublons, la saisie et l'import/export de jeux de données JSON.

---

## ✨ Fonctionnalités Principales

- **🧭 Navigation en Onglets** :
  - **Accueil / Vue d'ensemble** : Cartes récapitulatives, distribution par plage de coefficient et aperçu rapide.
  - **Saisie & Données** : Tableau interactif avec pagination, tri par colonne, sélection multiple et édition.
  - **Statistiques & Doublons** : Analyses graphiques des coefficients, détection des doublons et métriques clés.

- **⏱️ Filtrage Multicritère Avancé** :
  - Filtrage temporel par **Année**, **Mois**, **Date précise (Jour)** et **Heure (00h - 23h)**.
  - Filtre dédié aux **Doublons** (tous les doublons, valeurs uniques, ou coefficient spécifique).
  - Plages de coefficient **Min / Max** et recherche instantanée dans les **Hash SHA-256** et dates.

- **💾 Import & Export Polyvalents** :
  - Importation par **Glisser-Déposer** de fichier JSON ou par **Copier-Coller** direct avec validation de syntaxe.
  - Modes d'importation au choix : *Remplacement total* ou *Fusion / Ajout*.
  - Exportation ciblée (éléments filtrés, sélection manuelle ou totalité) en formats **JSON** et **CSV (Excel)**.

- **🎨 Design Frosted Glass (Effet Verre Dépoli)** :
  - Arrière-plans translucides avec flou d'arrière-plan (`backdrop-blur`).
  - Thème sombre & clair avec bascule dynamique.
  - Typographie nette et contrastes respectant les normes d'accessibilité WCAG AA.

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) version 18 ou supérieure
- `npm` ou `yarn`

### Installation
```bash
git clone https://github.com/votre-utilisateur/votre-depot.git
cd votre-depot
npm install
```

### Lancement en mode Développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:3000`.

### Construction pour la Production
```bash
npm run build
```
Les fichiers statiques optimisés seront générés dans le répertoire `dist/`.

---

## 🌐 Déploiement sur GitHub Pages

Ce projet inclut un workflow GitHub Actions prêt à l'emploi (`.github/workflows/deploy.yml`).

1. Poussez votre code sur votre dépôt GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<votre-nom>/<nom-du-repo>.git
   git push -u origin main
   ```
2. Rendez-vous dans les paramètres de votre dépôt GitHub (**Settings** > **Pages**).
3. Sous **Build and deployment** > **Source**, sélectionnez **GitHub Actions**.
4. Chaque push sur la branche `main` déclenchera automatiquement le déploiement sur GitHub Pages.

---

## 🛠️ Technologies Utilisées
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide Icons**
- **Vite**
