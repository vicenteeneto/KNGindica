import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { useNotifications } from '../NotificationContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

export default function UpdatePasswordScreen({ onNavigate }: NavigationProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showModal } = useNotifications();
  const { role } = useAuth();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      showModal({
        title: 'Atenção',
        message: 'A senha deve ter pelo menos 6 caracteres.',
        type: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        throw error;
      }
      
      showModal({
        title: 'Sucesso',
        message: 'Sua senha foi atualizada com sucesso!',
        type: 'success'
      });
      
      // Navigate to correct home page
      if (role === 'admin') {
        onNavigate('adminDashboard');
      } else {
        onNavigate('home');
      }
    } catch (err: any) {
      showModal({
        title: 'Erro',
        message: err.message || 'Falha ao atualizar a senha.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen netflix-main-bg justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto bg-white/5 p-8 rounded-3xl shadow-xl border border-white/5 backdrop-blur-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl">lock_reset</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center text-slate-800 dark:text-white">
            Redefinir Senha
          </h1>
          <p className="text-slate-500 text-center text-sm">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nova Senha</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-slate-400">lock</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all dark:text-white"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center hover:bg-orange-600 transition-all shadow-lg shadow-primary/30 disabled:opacity-70"
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              'Salvar Nova Senha'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
