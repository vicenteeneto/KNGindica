import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'client' | 'provider' | 'admin' | null;

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setDevRole: (role: UserRole) => void;
  upgradeToProvider: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, userEmail?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const adminEmails = ['offkngpublicidade@gmail.com', 'netu.araujo@gmail.com'];
      const isHardcodedAdmin = userEmail && adminEmails.includes(userEmail);

      if (!error && data) {
        const finalRole = isHardcodedAdmin ? 'admin' : (data.role as UserRole);
        setRole(finalRole);
        setProfile(data as UserProfile);

        // Se é um admin via e-mail mas o banco diz outra coisa, tenta atualizar no banco
        if (isHardcodedAdmin && data.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
        }
      } else if (isHardcodedAdmin) {
        // Se o perfil não existir ainda mas for admin por e-mail, permite acesso básico
        setRole('admin');
      } else {
        // FALLBACK: Se o perfil não existe (trigger falhou), tenta criar agora como 'client'
        // Isso resolve erros de cadastro via Google ou instabilidades no trigger
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'Novo Usuário',
            email: userEmail,
            role: user?.user_metadata?.role || 'client',
            plan_type: 'basic'
          })
          .select()
          .single();
        
        if (!createError && newProfile) {
          setRole(newProfile.role as UserRole);
          setProfile(newProfile as UserProfile);
        } else {
          console.error('Falha ao criar perfil de fallback:', createError);
          setRole(user?.user_metadata?.role || 'client');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id, user.email);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  // Keep this for the sandbox mode in AuthScreen
  const setDevRole = (newRole: UserRole) => {
    setRole(newRole);
  };

  const upgradeToProvider = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'provider' })
        .eq('id', user.id);
      
      if (error) throw error;
      
      await refreshProfile();
      return true;
    } catch (e) {
      console.error("Erro no upgrade de role:", e);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, logout, signInWithGoogle, setDevRole, upgradeToProvider, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
