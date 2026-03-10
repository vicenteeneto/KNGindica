import React, { useState } from 'react';
import { NavigationProps } from '../types';

export default function MaiaAssistantScreen({ onNavigate }: NavigationProps) {
  const [inputText, setInputText] = useState('');

  return (
    <div className="relative mx-auto flex h-screen w-full flex-col bg-[#e5ddd5] dark:bg-slate-900 overflow-hidden font-display antialiased">
      {/* Header */}
      <div className="flex items-center bg-primary text-white p-3 gap-3 shadow-md z-10 sticky top-0">
        <button 
          onClick={() => onNavigate('home')}
          className="material-symbols-outlined cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors"
        >
          arrow_back
        </button>
        <div className="relative shrink-0">
          <div 
            className="bg-primary/20 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-white/20" 
            title="Avatar circular da assistente virtual MAIA" 
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDU4c5UGnllwSwkYQq6_vbHZO5FLVBPJoM0oH5jqcSFiP989WCLH7Uj2jYnSDzRwL3CWp9aXgIMe1M2mpPQ0R3H4Q4YIFpSHv8tbaWiDsyEYPI_4K6HnK0OrKvefKg0ImNsipqwg-hRe6_dT3DCEEHx6mxOEVxyPbOpMFJ2bDS4_QpprD6gT5YKUO_NZlqKbi8pz4uixK78JVkMuYn5mhMUnvwEI3kX54XzC2ZkbPBx6DkCBcWza_I8Opz3fJ7GbEZbyLvgjNGqfkA")' }}
          />
          <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-primary rounded-full"></div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <h2 className="text-white text-base font-bold leading-tight truncate">MAIA</h2>
          <p className="text-white/80 text-xs font-normal">Online</p>
        </div>
        <div className="flex items-center gap-4">
          <span 
            className="material-symbols-outlined cursor-pointer text-2xl hover:bg-white/10 p-1 rounded-full transition-colors"
            onClick={() => alert('Iniciar chamada de vídeo com assistente?')}
          >
            videocam
          </span>
          <span 
            className="material-symbols-outlined cursor-pointer text-2xl hover:bg-white/10 p-1 rounded-full transition-colors"
            onClick={() => alert('Iniciar chamada de voz com assistente?')}
          >
            call
          </span>
          <span 
            className="material-symbols-outlined cursor-pointer text-2xl hover:bg-white/10 p-1 rounded-full transition-colors"
            onClick={() => alert('Opções da MAIA: Limpar chat, etc')}
          >
            more_vert
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none">
        
        {/* Message Date Divider */}
        <div className="flex justify-center my-2">
          <span className="bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-[11px] px-2 py-1 rounded-lg uppercase tracking-wider font-semibold">Hoje</span>
        </div>

        {/* MAIA Message 1 */}
        <div className="flex items-start gap-2 max-w-[85%]">
          <div className="flex flex-col gap-1 items-start">
            <div className="relative text-sm font-normal leading-normal rounded-xl rounded-tl-none px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm">
              Olá! Sou a MAIA, sua assistente virtual de serviços em Rondonópolis. Em que posso te ajudar hoje?
              <span className="block text-[10px] text-right text-slate-400 mt-1">14:02</span>
            </div>
          </div>
        </div>

        {/* User Message */}
        <div className="flex items-start gap-2 max-w-[85%] ml-auto justify-end">
          <div className="flex flex-col gap-1 items-end">
            <div className="relative text-sm font-normal leading-normal rounded-xl rounded-tr-none px-3 py-2 bg-[#dcf8c6] dark:bg-primary/40 text-slate-900 dark:text-slate-100 shadow-sm">
              Preciso de um eletricista urgente.
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-300">14:05</span>
                <span className="material-symbols-outlined text-xs text-primary">done_all</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIA Message 2 */}
        <div className="flex items-start gap-2 max-w-[85%]">
          <div className="flex flex-col gap-1 items-start">
            <div className="relative text-sm font-normal leading-normal rounded-xl rounded-tl-none px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm">
              Entendido! Estou buscando os melhores eletricistas perto de você...
              <span className="block text-[10px] text-right text-slate-400 mt-1">14:05</span>
            </div>
          </div>
        </div>

        {/* Provider Cards List */}
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Provider 1 */}
          <div 
            className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            onClick={() => onNavigate('profile', { professionalId: '1' })}  
          >
            <div 
              className="bg-slate-200 dark:bg-slate-700 bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12" 
              title="Foto de perfil do Ricardo, eletricista" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDhFiMF8qChwLh1DMSftqfo0AdyEQ_jnRdW5DJW81gSjL0D2Y_t3jZR7KBd3BpePcAz42MI3vhLyRRAcIT2f33quAAMhB7NW3Bs6Ao2vyWEHnRpEFsx1GWFnpZDIHb9ph4mT7pYZl8lNYP1ObcxqbG7_EaOytkotpuD6mN93fp6RNB7E7ZwyH4BIOHAvPDv66___bJwGKu8YWRPfM7eqj6_1ZOcd6QWtOY7IvQkinX2eerECfkd08Lu8MR28_32qUVAQLjuuMQYYUA")' }}
            />
            <div className="flex flex-1 flex-col justify-center">
              <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold">Ricardo - Eletricista</p>
              <p className="text-green-600 dark:text-green-400 text-xs font-medium">Disponível agora</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
              <span className="text-primary text-xs font-bold">⭐ 4.9</span>
            </div>
          </div>

          {/* Provider 2 */}
          <div 
            className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            onClick={() => onNavigate('profile', { professionalId: '2' })}
          >
            <div 
              className="bg-slate-200 dark:bg-slate-700 bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12" 
              title="Foto de perfil do Marcos, eletricista" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCZCwkcGb0amX3mvuRvhOJ3b8LbxHLWVr1m7VUQQkMwIyaV1TWYUcxb-3GWOBUImYDyHe9SkO552sNnlRl11R_zEqq_llF_zAc5iFhpBvxEXCtRM8akazdGL34fBC0utwLgbMLLjUE0nTTAXKCHW8424D-rHtnkbujurK2GGxEVnsxR3lGedFEaRy39WXi2wTQBLljyKWsGjzAx5UE61TABdUzwJUcVvqUi9C2sKOk0fvyH9Ni-t2faU-cbYyzkMjOFOBvLWSs36X8")' }}
            />
            <div className="flex flex-1 flex-col justify-center">
              <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold">Marcos - Eletricista</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">A 2km de você</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
              <span className="text-primary text-xs font-bold">⭐ 4.8</span>
            </div>
          </div>

          {/* Provider 3 */}
          <div 
            className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            onClick={() => onNavigate('profile', { professionalId: '3' })}
          >
            <div 
              className="bg-slate-200 dark:bg-slate-700 bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12" 
              title="Foto de perfil da Elétrica Silva" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAlJxyhemRimmIi7HAzW6Cz1sJokpH_EFVlPMHjeUsc8u8wAMODCky57QK_sjwiuual6bD-NY3GZvag9r8PKH6dpTlTbjjKbHBnJbXWJ5_Gaf_D2CLImRe4zalJAdBQIbRpJ934ukFL0To76AisWNzOqO7Qm_LpFJ8l-TvHbcicy6fpboSF3oft4MZlwmzZB43nRHcNh158n_dYaZHm7WKMWMjXlyybiXsOER-BtrsavK3L2zozydAV6wWcStsJ989Y-3B51bo8nW8")' }}
            />
            <div className="flex flex-1 flex-col justify-center">
              <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold">Elétrica Silva</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Atendimento 24h</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
              <span className="text-primary text-xs font-bold">⭐ 4.7</span>
            </div>
          </div>
        </div>

        {/* MAIA Message 3 - Call to Action */}
        <div className="flex items-start gap-2 max-w-[85%] pb-4">
          <div className="flex flex-col gap-2 items-start">
            <div className="relative text-sm font-normal leading-normal rounded-xl rounded-tl-none px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm">
              Para ver o perfil completo, fotos de trabalhos e contratar, acesse o link abaixo:
              <span className="block text-[10px] text-right text-slate-400 mt-1">14:06</span>
            </div>
            <button 
              onClick={() => onNavigate('listing', { category: 'Elétrica' })}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 text-sm font-bold text-white shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-lg">open_in_new</span>
              Ver todos os detalhes na plataforma
            </button>
          </div>
        </div>

      </div>

      {/* Message Input */}
      <div className="bg-[#f0f2f5] dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 flex items-center gap-2 z-10 sticky bottom-0">
        <div className="flex flex-1 items-center bg-white dark:bg-slate-800 rounded-full px-3 py-2 gap-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
          <span 
            className="material-symbols-outlined text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={() => alert('Abrir janela de emojis')}
          >
            mood
          </span>
          <input 
            className="flex-1 border-none bg-transparent text-sm focus:ring-0 text-slate-900 dark:text-slate-100 placeholder-slate-500 outline-none w-full" 
            placeholder="Mensagem" 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputText.trim() !== '') {
                alert(`Mensagem enviada para MAIA: ${inputText}`);
                setInputText('');
              }
            }}
          />
          <span 
            className="material-symbols-outlined text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={() => alert('Anexar arquivo para a MAIA')}
          >
            attach_file
          </span>
          <span 
            className="material-symbols-outlined text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={() => alert('Tirar foto e enviar para a MAIA')}
          >
            photo_camera
          </span>
        </div>
        <button 
          onClick={() => {
            if (inputText.trim() !== '') {
              alert(`Mensagem enviada para MAIA: ${inputText}`);
              setInputText('');
            } else {
              alert('Pressione e segure para enviar uma mensagem de áudio.');
            }
          }}
          className="flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-md active:scale-90 transition-transform shrink-0"
        >
          <span className="material-symbols-outlined">{inputText.trim() !== '' ? 'send' : 'mic'}</span>
        </button>
      </div>
    </div>
  );
}
