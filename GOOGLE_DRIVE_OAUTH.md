# Configuration OAuth Google Drive

Le site conserve le flux actuel par API serveur comme solution de secours et peut utiliser un accès direct depuis le navigateur après autorisation Google. Le navigateur reçoit uniquement un jeton d’accès temporaire en mémoire ; aucun secret client ni jeton persistant n’est enregistré dans le dépôt ou dans `localStorage`.

## Configuration Google Cloud

Dans le projet Google Cloud qui possède l’API Drive, activez **Google Drive API**, configurez l’écran de consentement et créez un identifiant OAuth de type **Application Web**. Ajoutez exactement les origines JavaScript suivantes :

- `https://jetx-ou-aviatorio.vercel.app`
- `http://localhost:3000`

Le flux actuel demande `https://www.googleapis.com/auth/drive.readonly` pour lister et lire les JSON du dossier configuré. Cette permission est large et peut nécessiter la vérification Google pour une application publique. Pour une version plus restrictive, il faudra remplacer le listing direct par Google Picker et utiliser `drive.file` avec sélection explicite des fichiers.

## Variables Vercel

Ajouter la variable publique suivante dans les environnements nécessaires, puis reconstruire le projet :

```text
VITE_GOOGLE_CLIENT_ID=<identifiant OAuth Web se terminant par .apps.googleusercontent.com>
VITE_GOOGLE_DRIVE_FOLDER_ID=124twvdWV2AEkMk3_92v99RV_cDcEle8R
```

`VITE_GOOGLE_DRIVE_FOLDER_ID` est facultative pour le dossier actuel : l’application utilise cet identifiant comme valeur de secours non secrète si la variable n’est pas définie.

Ne pas ajouter de `client_secret` dans Vercel côté frontend, dans `.env.example` avec une valeur réelle, ni dans GitHub. La clé API utilisée par le fallback serveur reste uniquement dans `GOOGLE_DRIVE_API_KEY` côté serveur.

## Utilisation dans l’application

Dans **Saisie & Données** ou dans **Comparer deux fichiers Google Drive**, cliquer sur **Se connecter à Google**, choisir le compte puis valider la permission de lecture. Après connexion, les appels de liste et de téléchargement utilisent le jeton OAuth direct ; après déconnexion, le jeton est révoqué et supprimé de la mémoire de la page.

Si `VITE_GOOGLE_CLIENT_ID` n’est pas configuré, le bouton reste visible mais indique la configuration manquante et le site conserve le mode public serveur existant.

## Références

[1]: https://developers.google.com/workspace/drive/api/quickstart/js "Google Drive API — JavaScript quickstart"
[2]: https://developers.google.com/workspace/drive/api/guides/api-specific-auth "Google Drive API — Choose API scopes"
[3]: https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow "Google OAuth 2.0 for client-side web applications"
