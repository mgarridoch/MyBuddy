import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { App as CapApp } from '@capacitor/app';

const GOOGLE_TOKEN_KEY = 'mybuddy_google_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'mybuddy_google_token_expiry';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  googleToken: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  clearGoogleToken: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  googleToken: null,
  loading: true,
  signOut: async () => {},
  clearGoogleToken: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    if (savedToken && expiry && Date.now() < parseInt(expiry, 10)) {
      return savedToken;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const syncGoogleToken = (currentSession: Session | null) => {
    if (currentSession?.provider_token) {
      // Guardamos el token por 55 minutos (los tokens de Google duran 60 min)
      const expiryTime = Date.now() + 55 * 60 * 1000;
      localStorage.setItem(GOOGLE_TOKEN_KEY, currentSession.provider_token);
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTime.toString());
      setGoogleToken(currentSession.provider_token);

      // Limpiamos el hash feo (#access_token=...) de la URL sin recargar la página
      if (window.location.hash.includes('access_token')) {
        const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    // En Supabase v2, onAuthStateChange emite INITIAL_SESSION inmediatamente.
    // Usamos un solo flujo para evitar el doble setSession al arrancar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(prev => {
        // Evitamos actualizar referencia si es exactamente el mismo access_token
        if (prev?.access_token === newSession?.access_token && prev !== null) {
          return prev;
        }
        return newSession;
      });
      setUser(newSession?.user ?? null);
      syncGoogleToken(newSession);
      setLoading(false);
    });
    // Listener para atrapar el login cuando regresa por Deep Link (mybuddy://auth-callback#access_token=...)
    const appUrlListener = CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (url.includes('#')) {
        const hash = url.split('#')[1];
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const provider_token = params.get('provider_token');

        if (provider_token) {
          const expiryTime = Date.now() + 55 * 60 * 1000;
          localStorage.setItem(GOOGLE_TOKEN_KEY, provider_token);
          localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTime.toString());
          setGoogleToken(provider_token);
        }

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
      appUrlListener.then(l => l.remove());
    };
  }, []);

  const clearGoogleToken = () => {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    setGoogleToken(null);
  };

  const signOut = async () => {
    clearGoogleToken();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, googleToken, loading, signOut, clearGoogleToken }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);