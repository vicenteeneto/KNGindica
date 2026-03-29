import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'client' | 'provider' | 'admin' | null;

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  plan_type?: 'basic' | 'plus' | null;
  terms_accepted?: boolean;
  address_complement?: string | null;
  opening_hours?: string | null;
  loyalty_enabled?: boolean;
  loyalty_required_services?: number;
  loyalty_benefit_description?: string | null;
  profiles_private?: { cpf: string | null }[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  setDevRole: (role: UserRole) => void;
  upgradeToProvider: () => Promise<boolean>;
  refreshProfile: (silent?: boolean) => Promise<void>;
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
        fetchUserProfile(session.user.id, session.user.email, session.user.user_metadata);
      } else {
        setLoading(false);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
          window.dispatchEvent(new Event('kng-password-recovery'));
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email, session.user.user_metadata);
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

  const fetchUserProfile = async (userId: string, userEmail?: string, userMetadata?: any, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, profiles_private(cpf)')
        .eq('id', userId)
        .single();

      const adminEmails = ['offkngpublicidade@gmail.com'];
      const isHardcodedAdmin = !!(userEmail && adminEmails.includes(userEmail.toLowerCase()));

      if (!error && data) {
        const finalRole = isHardcodedAdmin ? 'admin' : (data.role as UserRole);
        setRole(finalRole);
        
        // Flatten private data if exists (can be object or array depending on relation)
        const profileData = { ...data };
        const privateData = data.profiles_private;
        if (privateData) {
          if (Array.isArray(privateData) && privateData.length > 0) {
            (profileData as any).cpf = privateData[0].cpf;
          } else if (!Array.isArray(privateData)) {
            (profileData as any).cpf = (privateData as any).cpf;
          }
        }
        setProfile(profileData as UserProfile);

        // Se é um admin via e-mail mas o banco diz outra coisa, tenta atualizar no banco silenciosamente
        if (isHardcodedAdmin && data.role !== 'admin') {
          supabase.from('profiles').update({ role: 'admin' }).eq('id', userId).then();
        }

        // Se o perfil existe mas está sem imagem e temos uma do Google, atualiza no banco
        const googleAvatar = userMetadata?.avatar_url || userMetadata?.picture;
        if (googleAvatar && !data.avatar_url) {
          supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', userId).then();
        }
      } else if (isHardcodedAdmin) {
        // Se o perfil não existir ainda mas for admin por e-mail, permite acesso sem travar
        setRole('admin');
        setProfile({ id: userId, full_name: 'Administrador', role: 'admin', avatar_url: null });
      } else {
        // FALLBACK: Se o perfil não existe (trigger falhou), tenta criar agora como 'client'
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: userMetadata?.full_name || userMetadata?.name || 'Novo Usuário',
            email: userEmail,
            avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
            role: userMetadata?.role || 'client',
            plan_type: 'basic',
            status: 'active'
          })
          .select()
          .single();
        
        if (!createError && newProfile) {
          setRole(newProfile.role as UserRole);
          setProfile(newProfile as UserProfile);
        } else {
          console.error('Falha ao criar perfil de fallback:', createError);
          setRole((userMetadata?.role as UserRole) || 'client');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Última tentativa para admins hardcoded não ficarem presos
      if (userEmail && userEmail.toLowerCase() === 'offkngpublicidade@gmail.com') {
        setRole('admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async (silent = true) => {
    if (user?.id) {
      await fetchUserProfile(user.id, user.email, user.user_metadata, silent);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || window.location.origin
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
