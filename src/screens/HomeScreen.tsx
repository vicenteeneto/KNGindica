import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen } from '../types';
import { professionals } from '../data/mockData';
import MobileNav from '../components/MobileNav';
import { useAuth } from '../AuthContext';

export default function HomeScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onNavigate('listing', { searchQuery });
    }
  };

  const featuredProfessionals = professionals.filter(p => p.isAffiliate);

  return (
    <div className="w-full bg-slate-50 dark:bg-[#141414] min-h-screen flex flex-col font-display text-slate-900 dark:text-slate-100 pb-20 md:pb-0 overflow-x-hidden">
      {/* Floating Modern Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 pt-6 pb-4 md:py-4 ${isScrolled
        ? 'bg-white/90 dark:bg-[#000000]/90 backdrop-blur-md shadow-sm'
        : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
        }`}>
        <div className="flex items-center justify-between mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-white">
            <span className={`material-symbols-outlined text-2xl ${isScrolled ? 'text-primary' : 'text-white'}`}>
              location_on
            </span>
            <div>
              <p className={`text-[10px] uppercase tracking-wider font-bold ${isScrolled ? 'text-slate-500 dark:text-slate-400' : 'text-white/80'}`}>
                Localização
              </p>
              <h2 className={`text-lg font-bold leading-tight ${isScrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`}>Rondonópolis</h2>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center gap-8 ${isScrolled ? 'text-slate-600 dark:text-slate-300' : 'text-white/90'}`}>
            <button onClick={() => onNavigate('home')} className="text-sm font-bold hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">home</span> Início
            </button>
            <button onClick={() => onNavigate('categories')} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">category</span> Categorias
            </button>
            <button onClick={() => onNavigate('myRequests')} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">assignment</span> Pedidos
            </button>
            <button onClick={() => onNavigate('userProfile')} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">person</span> Perfil
            </button>
            {user?.email === 'offkngpublicidade@gmail.com' && (
              <button onClick={() => onNavigate('adminDashboard')} className="text-sm font-medium text-red-400 hover:text-red-500 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span> Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {/* Search Bar - Desktop */}
            <div className={`relative group hidden md:block w-64 transition-all duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-xl">search</span>
              </div>
              <input
                className="block w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-500 transition-all outline-none"
                placeholder="Buscar serviços..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>

            <button onClick={() => onNavigate('chatList')} className={`relative p-2 rounded-full transition-colors ${isScrolled ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300' : 'hover:bg-white/20 text-white'}`} title="Mensagens">
              <span className="material-symbols-outlined">chat</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-transparent"></span>
            </button>
            <button onClick={() => onNavigate('notifications')} className={`relative p-2 rounded-full transition-colors ${isScrolled ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300' : 'hover:bg-white/20 text-white'}`} title="Notificações">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-transparent"></span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {/* Netflix-Style Hero Banner */}
        <section className="relative w-full h-[60vh] md:h-[80vh] min-h-[500px] flex items-end pb-12 overflow-hidden bg-black">
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop"
              alt="Hero Background"
              className="w-full h-full object-cover opacity-70 scale-105 transform hover:scale-100 transition-transform duration-[10000ms]"
            />
            {/* Gradient Overlay for Text Readability - Netflix style fade to body color */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/20 to-transparent dark:from-[#141414] dark:via-[#141414]/40 dark:to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 mt-20">
            <div className="max-w-2xl">
              {/* Top Badge */}
              <div className="flex items-center gap-2 mb-4 animate-fade-in-up">
                <span className="text-red-600 font-bold text-sm tracking-widest uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                  Em Alta
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg">
                Renove sua <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Casa Hoje.</span>
              </h1>

              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl font-medium drop-shadow-md line-clamp-3">
                Os melhores profissionais de Rondonópolis estão aqui. Aproveite <strong className="text-white">20% OFF</strong> em serviços de pintura por tempo limitado.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => onNavigate('listing', { category: 'Reformas' })}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-8 py-3.5 rounded-lg font-bold text-lg hover:bg-white/90 transition-colors shadow-lg shadow-white/10"
                >
                  <span className="material-symbols-outlined fill-current">play_arrow</span>
                  Contratar Agora
                </button>
                <button
                  onClick={() => onNavigate('categories')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-500/50 backdrop-blur-md text-white px-8 py-3.5 rounded-lg font-bold text-lg hover:bg-gray-500/70 transition-colors"
                >
                  <span className="material-symbols-outlined">info</span>
                  Mais Informações
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Floating Search Bar for Mobile (Pushed down by Hero) */}
        <div className="md:hidden px-4 -mt-6 relative z-20 mb-8">
          <div className="relative group bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-black/5">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">
                search
              </span>
            </div>
            <input
              className="block w-full pl-12 pr-4 py-4 bg-transparent border-none text-base focus:ring-0 placeholder:text-slate-500 transition-all outline-none"
              placeholder="O que você precisa hoje?"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto space-y-12 md:space-y-16 mt-8 md:mt-12 overflow-hidden pb-12">

          {/* Categories Carousel (Netflix style generic genre row) */}
          <section className="px-4 md:px-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Categorias Populares
              </h3>
              <button onClick={() => onNavigate('listing')} className="text-primary text-sm font-bold flex items-center hover:underline">
                Explorar todas <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Horizontal Scroll Area */}
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
              {[
                { name: 'Limpeza', icon: 'cleaning_services', color: 'from-blue-500 to-cyan-500' },
                { name: 'Reformas', icon: 'construction', color: 'from-orange-500 to-red-500' },
                { name: 'Elétrica', icon: 'bolt', color: 'from-yellow-400 to-orange-500' },
                { name: 'Jardim', icon: 'yard', color: 'from-green-500 to-emerald-600' },
                { name: 'Montagem', icon: 'handyman', color: 'from-indigo-500 to-purple-600' },
                { name: 'Encanador', icon: 'plumbing', color: 'from-cyan-600 to-blue-700' },
              ].map((cat, i) => (
                <div
                  key={cat.name}
                  onClick={() => onNavigate('listing', { category: cat.name })}
                  className="snap-start shrink-0 cursor-pointer group w-32 md:w-40"
                >
                  <div className={`w-full aspect-video rounded-xl bg-gradient-to-br ${cat.color} p-1 shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1`}>
                    <div className="w-full h-full bg-black/10 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-white gap-2 border border-white/20 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-20 transform group-hover:scale-150 transition-transform duration-500">
                        <span className="material-symbols-outlined text-6xl">{cat.icon}</span>
                      </div>
                      <span className="material-symbols-outlined text-3xl drop-shadow-md z-10">{cat.icon}</span>
                      <span className="text-sm font-bold tracking-wide z-10">{cat.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>



          {/* Featured Professionals (Netflix Style Row - "Em Alta na sua Região" / "Recomendados") */}
          <section className="px-4 md:px-8">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Profissionais em Alta
              </h3>
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm hidden md:inline-block">
                VIP
              </span>
            </div>

            {/* Horizontal Scroll Area */}
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
              {featuredProfessionals.map((professional) => (
                <div
                  key={professional.id}
                  onClick={() => onNavigate('profile', { professionalId: professional.id })}
                  className="snap-start shrink-0 w-[240px] md:w-[280px] group cursor-pointer"
                >
                  <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-slate-200 dark:bg-slate-800 mb-3">
                    <img
                      className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                      src={professional.image}
                      alt={professional.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent opacity-80 transition-opacity duration-300"></div>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] flex items-center gap-1 font-bold text-white shadow-sm w-max">
                        <span className="material-symbols-outlined text-[12px] text-yellow-500">star</span>
                        {professional.rating}
                      </div>
                    </div>
                    {/* MAIA verification badge */}
                    <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform z-10">
                      <span className="material-symbols-outlined text-white text-[16px]">verified</span>
                    </div>

                    {/* Bottom Info inside image */}
                    <div className="absolute bottom-4 left-4 right-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 z-10">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-lg md:text-xl leading-tight truncate drop-shadow-md">
                          {professional.name}
                        </h4>
                      </div>
                      <p className="text-xs text-white/80 drop-shadow-md text-primary font-semibold mb-2">
                        {professional.service}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/20">
                        <span className="text-sm font-bold text-white">
                          R$ {professional.price}<span className="text-[10px] text-white/60 font-normal">/{professional.priceUnit}</span>
                        </span>
                        <p className="text-[10px] text-white/70 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {professional.distance}km
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* MAIA Chatbot FAB */}
      <button
        onClick={() => onNavigate('maia')}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 bg-primary text-white p-3.5 md:p-4 rounded-full shadow-lg shadow-primary/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center animate-bounce border-2 border-white/20 dark:border-black"
        style={{ animationDuration: '3s' }}
        title="Falar com a MAIA Assistente"
      >
        <span className="material-symbols-outlined text-2xl md:text-3xl">smart_toy</span>
      </button>

      {/* Bottom Navigation (Mobile Only) */}
      <MobileNav onNavigate={onNavigate} currentScreen="home" />

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
