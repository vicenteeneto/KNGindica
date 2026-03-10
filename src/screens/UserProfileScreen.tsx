import React, { useState, useRef } from 'react';
import { NavigationProps } from '../types';
import MobileNav from '../components/MobileNav';
import ProviderMobileNav from '../components/ProviderMobileNav';
import { supabase } from '../lib/supabase';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import ImageCropper from '../components/ImageCropper';

export default function UserProfileScreen({ onNavigate }: NavigationProps) {
  const { user, profile, role, setDevRole, logout, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    logout();
    onNavigate('auth');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setSelectedImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
  };

  const uploadCroppedAvatar = async (croppedImage: File) => {
    try {
      setSelectedImageSrc(null); // Hide cropper
      setIsUploading(true);

      const fileExt = croppedImage.name.split('.').pop() || 'jpeg';
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImage);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh to get new avatar URL
      await refreshProfile();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // User presentation data
  const displayUser = {
    name: profile?.full_name || "Usuário",
    email: user?.email || "",
    avatar: profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png",
    joinDate: `Membro desde ${new Date(user?.created_at || Date.now()).getFullYear()}`,
    points: 0
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">

      {/* Header Profile Area (Gradient bg) */}
      <div className="bg-gradient-to-b from-primary/20 to-transparent dark:from-primary/10 pt-12 pb-6 px-4 shrink-0 shadow-sm border-b border-white/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="relative mb-4">
            <div
              className={`size-24 rounded-full bg-cover bg-center border-4 border-white dark:border-slate-900 shadow-xl ${isUploading ? 'opacity-50' : ''}`}
              style={{ backgroundImage: `url('${displayUser.avatar}')` }}
            >
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined animate-spin text-white drop-shadow-md">progress_activity</span>
                </div>
              )}
            </div>
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 size-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm hover:scale-105 transition-transform disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              value="" // Reset value so onChange fires even for same file
              onChange={handleFileChange}
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-center">{displayUser.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{displayUser.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-white/50 dark:bg-slate-800/50 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {displayUser.joinDate}
            </span>
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-800/50">
              <span className="material-symbols-outlined text-[14px]">stars</span>
              {displayUser.points} pts
            </span>
          </div>
        </div>
      </div>

      {/* Main Options */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full pb-32">

        {/* Account Info Section */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 px-2">Minha Conta</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button
              onClick={() => alert('Editar dados pessoais')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Dados Pessoais</p>
                  <p className="text-xs text-slate-500">Nome, CPF, Telefone</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => alert('Gerenciar endereços')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Meus Endereços</p>
                  <p className="text-xs text-slate-500">Casa, Trabalho</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => alert('Gerenciar métodos de pagamento')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                  <span className="material-symbols-outlined">credit_card</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Pagamentos</p>
                  <p className="text-xs text-slate-500">Cartões salvos, Pix</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Configs Section */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 px-2">Configurações</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button
              onClick={() => onNavigate('notifications')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Notificações</p>
                  <p className="text-xs text-slate-500">Push, E-mail, SMS</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            {/* In-app theme toggle replaces the floating button */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                  <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Aparência do App</p>
                  <p className="text-xs text-slate-500">
                    {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                  </p>
                </div>
              </div>
              <div className="w-10 h-6 bg-slate-200 dark:bg-primary rounded-full relative transition-colors shadow-inner flex items-center shrinks-0">
                <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow transition-all ${theme === 'dark' ? 'left-5' : 'left-1'}`}></div>
              </div>
            </button>

            <button
              onClick={() => alert('Abrir central de ajuda')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                  <span className="material-symbols-outlined">help</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Central de Ajuda</p>
                  <p className="text-xs text-slate-500">Dúvidas e suporte</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Profile Switcher */}
        <section className="mb-8">
          <div className="bg-gradient-to-tr from-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-lg shadow-black/10 relative overflow-hidden flex flex-col items-start gap-4 border border-slate-700">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full flex items-start justify-end p-4">
              <span className="material-symbols-outlined text-4xl text-white/20">swap_horiz</span>
            </div>
            <div className="relative z-10 w-3/4">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">
                  {role === 'provider' ? 'person' : 'handyman'}
                </span>
                {role === 'provider' ? 'Modo Cliente' : 'Modo Prestador'}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {role === 'provider'
                  ? 'Alternar para a visualização de busca e contratação de serviços.'
                  : 'Alternar para a visualização exclusiva de prestador de serviços.'}
              </p>
            </div>
            <button
              onClick={() => {
                if (role === 'provider') {
                  setDevRole('client');
                  onNavigate('home');
                } else {
                  setDevRole('provider');
                  onNavigate('dashboard');
                }
              }}
              className="relative z-10 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all w-full flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined">switch_account</span>
              {role === 'provider' ? 'Mudar para Cliente' : 'Mudar para Prestador'}
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">logout</span>
          Sair da Conta
        </button>
        <p className="text-center text-xs text-slate-400 mt-6">Versão 1.0.0 (Build 42)</p>

      </main>

      {/* Using the standard MobileNav */}
      {role === 'provider' ? (
        <ProviderMobileNav onNavigate={onNavigate} currentScreen="profile" />
      ) : (
        <MobileNav onNavigate={onNavigate} currentScreen="profile" />
      )}

      {selectedImageSrc && (
        <ImageCropper
          imageSrc={selectedImageSrc}
          onCropSave={uploadCroppedAvatar}
          onCropCancel={() => setSelectedImageSrc(null)}
        />
      )}
    </div>
  );
}
