import React from 'react';
import { NavigationProps } from '../types';

export default function CategoriesScreen({ onNavigate }: NavigationProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onNavigate('listing', { searchQuery });
    }
  };

  return (
    <div className="bg-black font-display text-white min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-5xl mx-auto bg-black shadow-2xl overflow-x-hidden transition-all duration-300">
        
        <header className="flex items-center bg-black/90 backdrop-blur-md p-4 pb-2 justify-between sticky top-0 z-10 border-b border-white/5 transition-colors">
          <button onClick={() => onNavigate('home')} className="text-white flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h2 className="text-white text-lg font-black leading-tight tracking-tighter italic uppercase flex-1 text-center lg:text-left">Catálogo de Serviços</h2>
          <div className="flex size-10 items-center justify-end">
             {/* Spacing */}
          </div>
        </header>

        <main className="flex-1 pb-24">
          <div className="px-6 py-10 max-w-none lg:mx-0 transition-all duration-300">
            <div className="mb-8">
               <span className="text-[10px] font-black text-primary italic uppercase tracking-[0.2em] mb-2 block">Explorar KNGindica</span>
               <h1 className="text-4xl md:text-5xl font-black text-white mb-3 italic tracking-tighter leading-none">O QUE VOCÊ PRECISA <br/>HOJE?</h1>
               <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Encontre os melhores profissionais da região</p>
            </div>
            
            <label className="flex flex-col w-full">
              <div className="flex w-full items-center rounded-xl bg-white/5 border border-white/10 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all px-4 h-14 shadow-inner">
                <span className="material-symbols-outlined text-gray-500 mr-2 text-[24px]">search</span>
                <input 
                  className="w-full border-none bg-transparent focus:ring-0 text-white placeholder:text-gray-600 text-base outline-none font-bold" 
                  placeholder="Ex: Eletricista, Limpeza..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </label>
          </div>

          <div className="px-6 py-4 max-w-none lg:mx-0 transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">Categorias Principais</h2>
              <button onClick={() => onNavigate('listing')} className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Ver tudo</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { icon: 'cleaning_services', title: 'Limpeza', desc: 'Residencial' },
                { icon: 'bolt', title: 'Elétrica', desc: 'Reparos' },
                { icon: 'water_drop', title: 'Hidráulica', desc: 'Encanador' },
                { icon: 'format_paint', title: 'Pintura', desc: 'Acabamentos' },
                { icon: 'handyman', title: 'Montagem', desc: 'Móveis' },
                { icon: 'computer', title: 'TI', desc: 'Equipamentos' },
                { icon: 'content_cut', title: 'Beleza', desc: 'Estética' },
                { icon: 'local_shipping', title: 'Transporte', desc: 'Fretes' },
              ].map((cat, idx) => (
                <div onClick={() => onNavigate('listing')} key={idx} className="group flex flex-col items-center text-center gap-3 rounded-2xl border border-white/5 bg-white/2 p-6 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer select-none">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5 text-gray-400 group-hover:bg-primary group-hover:text-white transition-all group-hover:scale-110">
                    <span className="material-symbols-outlined text-3xl">{cat.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xs uppercase tracking-widest">{cat.title}</h3>
                    <p className="text-gray-500 text-[9px] mt-1 font-bold italic tracking-tighter">{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-8 mt-4 max-w-none lg:mx-0 transition-all duration-300">
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-orange-600 to-red-600 p-8 md:p-12 text-white relative shadow-2xl flex flex-col items-center text-center">
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 block">Fale com a MAIA</span>
                <h3 className="text-2xl md:text-4xl font-black mb-4 italic tracking-tighter">ESTÁ EM DÚVIDA?</h3>
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-8 max-w-xs mx-auto">Nós ajudamos você a encontrar o profissional mais qualificado para o seu caso.</p>
                <button onClick={() => onNavigate('helpCenter')} className="bg-white text-black font-black px-10 py-4 rounded-xl text-xs hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all shadow-2xl uppercase tracking-widest">
                  Solicitar Ajuda
                </button>
              </div>
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
