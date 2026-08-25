import React, { useState } from 'react';
import { CheckCircle2, Cloud, LogIn, LogOut, X } from 'lucide-react';
import { useGoogleDriveAuth } from '../auth/GoogleDriveAuthContext';

interface GoogleDriveLoginPanelProps {
  onSignedIn?: () => void;
}

export const GoogleDriveLoginPanel: React.FC<GoogleDriveLoginPanelProps> = ({ onSignedIn }) => {
  const { isConfigured, isReady, isSignedIn, error, signIn, signOut, clearError } = useGoogleDriveAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const token = await signIn();
    setIsSigningIn(false);
    if (token) {
      setIsOpen(false);
      onSignedIn?.();
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`rounded-lg p-2 ${isSignedIn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'}`}>
              {isSignedIn ? <CheckCircle2 className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Accès Google Drive</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{isSignedIn ? 'Session active en mémoire pour cette page.' : 'Autorise l’accès direct à tes fichiers Drive.'}</p>
            </div>
          </div>
          {isSignedIn ? (
            <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              <LogOut className="h-3.5 w-3.5" /> Se déconnecter
            </button>
          ) : (
            <button type="button" onClick={() => { clearError(); setIsOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-500">
              <LogIn className="h-3.5 w-3.5" /> Se connecter à Google
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-[10px] text-rose-700 dark:text-rose-300">{error}</p>}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="google-drive-login-title">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"><Cloud className="h-5 w-5" /></div>
                <div>
                  <h3 id="google-drive-login-title" className="text-base font-bold text-slate-900 dark:text-white">Valider l’accès Google Drive</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Google ouvrira sa propre fenêtre sécurisée pour choisir ton compte et confirmer les permissions.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
              L’application demande uniquement une autorisation de lecture Drive. Le jeton reste en mémoire et est supprimé lorsque tu te déconnectes ou fermes la page.
            </div>
            {!isConfigured && <p className="text-xs text-amber-700 dark:text-amber-300">La connexion n’est pas encore configurée sur ce déploiement : ajoute la variable publique `VITE_GOOGLE_CLIENT_ID` dans Vercel.</p>}
            {isConfigured && !isReady && <p className="text-xs text-slate-500 dark:text-slate-400">Chargement du module Google…</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Annuler</button>
              <button type="button" onClick={() => void handleSignIn()} disabled={!isConfigured || !isReady || isSigningIn} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                <LogIn className="h-3.5 w-3.5" /> {isSigningIn ? 'Ouverture…' : 'Continuer avec Google'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
