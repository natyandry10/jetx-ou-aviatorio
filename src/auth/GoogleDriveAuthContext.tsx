import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DEFAULT_GOOGLE_CLIENT_ID = '559702392895-a1ldmckihnjeu6r67e9mbifli0371mt2.apps.googleusercontent.com';

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  callback: (response: GoogleTokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleIdentityApi {
  accounts: {
    oauth2: {
      initTokenClient: (options: { client_id: string; scope: string; callback: (response: GoogleTokenResponse) => void }) => GoogleTokenClient;
      revoke: (accessToken: string, callback?: () => void) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

interface GoogleDriveAuthContextValue {
  isConfigured: boolean;
  isReady: boolean;
  isSignedIn: boolean;
  accessToken: string | null;
  error: string | null;
  signIn: () => Promise<string | null>;
  signOut: () => void;
  clearError: () => void;
}

const GoogleDriveAuthContext = createContext<GoogleDriveAuthContextValue | null>(null);

function getClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Le module de connexion Google n’a pas pu être chargé.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Le module de connexion Google n’a pas pu être chargé.'));
    document.head.appendChild(script);
  });
}

export const GoogleDriveAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const clientId = getClientId();
  const [isReady, setIsReady] = useState(Boolean(window.google?.accounts?.oauth2));
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);
  const pendingResolveRef = useRef<((token: string | null) => void) | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void loadGoogleIdentityScript()
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'La connexion Google est indisponible.');
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const signIn = useCallback(async (): Promise<string | null> => {
    if (!clientId) {
      const message = 'Connexion Google non configurée. Vérifiez le Client ID OAuth et les origines autorisées dans Google Cloud.';
      setError(message);
      return null;
    }
    try {
      await loadGoogleIdentityScript();
      if (!window.google?.accounts?.oauth2) throw new Error('Le module de connexion Google n’est pas prêt.');
      const token = await new Promise<string | null>((resolve) => {
        pendingResolveRef.current = resolve;
        const tokenClient = tokenClientRef.current ?? window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: DRIVE_SCOPE,
          callback: (response) => {
            if (response.error || !response.access_token) {
              setError(response.error_description ?? response.error ?? 'La connexion Google a été refusée.');
              pendingResolveRef.current?.(null);
              pendingResolveRef.current = null;
              return;
            }
            setAccessToken(response.access_token);
            setError(null);
            pendingResolveRef.current?.(response.access_token);
            pendingResolveRef.current = null;
          },
        });
        tokenClientRef.current = tokenClient;
        tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
      });
      return token;
    } catch (signInError: unknown) {
      const message = signInError instanceof Error ? signInError.message : 'Impossible de lancer la connexion Google.';
      setError(message);
      return null;
    }
  }, [accessToken, clientId]);

  const signOut = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    setAccessToken(null);
    setError(null);
  }, [accessToken]);

  const value = useMemo(() => ({
    isConfigured: Boolean(clientId),
    isReady,
    isSignedIn: Boolean(accessToken),
    accessToken,
    error,
    signIn,
    signOut,
    clearError: () => setError(null),
  }), [accessToken, clientId, error, isReady, signIn, signOut]);

  return <GoogleDriveAuthContext.Provider value={value}>{children}</GoogleDriveAuthContext.Provider>;
};

export function useGoogleDriveAuth(): GoogleDriveAuthContextValue {
  const value = useContext(GoogleDriveAuthContext);
  if (!value) throw new Error('useGoogleDriveAuth doit être utilisé dans GoogleDriveAuthProvider.');
  return value;
}
