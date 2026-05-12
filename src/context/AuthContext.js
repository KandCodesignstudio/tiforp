import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
      if (error) throw error;
    });

  const signup = (email, password) =>
    supabase.auth.signUp({ email, password }).then(({ error }) => {
      if (error) throw error;
    });

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email).then(({ error }) => {
      if (error) throw error;
    });

  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
