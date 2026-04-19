import React, { useState } from 'react';
import StarRating from '../components/StarRating';

import { NavigationProps } from '../types';

type Tab = 'Concluídos' | 'Em andamento' | 'Cancelados';

export default function ServiceHistoryScreen({ onNavigate }: NavigationProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Concluídos');
  const tabs: Tab[] = ['Concluídos', 'Em andamento', 'Cancelados'];

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="w-full bg-white dark:bg-slate-900 min-h-screen flex flex-col shadow-xl lg:pl-16">
        
        {/* Header */}
        <div className="relative z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center p-4 justify-between">
            <button onClick={() => onNavigate('home')} className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold flex-1 ml-2">Histórico de Serviços</h2>
            <button className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[24px]">search</span>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex px-4 gap-6 sm:gap-12 justify-center overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center justify-center border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary pb-3 pt-2'
                    : 'border-transparent text-slate-500 dark:text-slate-400 pb-3 pt-2 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <p className={`text-sm whitespace-nowrap ${activeTab === tab ? 'font-bold' : 'font-medium'}`}>
                  {tab}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Service Entry 1 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4 items-start">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBr8AYD4qJ2NEC6MU56rrSMNQCpPz52iJojmQrYKGQslXYdXvwk2DkEEDO7jVXKep9Xk5BtRdH57KqdQQ9UYc0eFclF-sBn-z_8cMyu5UXJu-A7KiZDpSOXNeHJtnVaJ_ZrhGIPQEPxJGQRnFCXGmEu9PdaZM-vmjIh-RB6SbdfvVM2ZilmeHCMHUIrPfaNJs3haf9j4fCeFfq1r7PYDmzk7Ud7iDB0rqeH2RpKT0u309E2G62cGZgc4W2Kkz8YZh0Qbjp5vwFFOhU")' }}></div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-900 dark:text-slate-100 text-base font-semibold">João Silva</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">Concluído</span>
                  </div>
                  <p className="text-primary text-xs font-medium mb-1">Encanador Hidráulico</p>
                  <div className="flex items-center gap-1 mb-1">
                    <StarRating rating={5} size={14} />
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1">(Sua avaliação)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">15 de Outubro, 2023 • Ref. #8842</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onNavigate('profile')} className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-semibold transition hover:bg-primary/90 active:scale-[0.98]">
                  Contratar Novamente
                </button>
                <button onClick={() => onNavigate('serviceStatus')} className="flex items-center justify-center rounded-lg h-10 w-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </button>
              </div>
            </div>

            {/* Service Entry 2 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4 items-start">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBN4bETLmsTF8u1ZH5MpGwzvdVRarBmbIibQD8ulrRvfiJqeFEb-HTur8EelDg-_zQvxeG9QclE6Z8rQTtTxaIuvrYRWRawag6zL33dkk4JG98wV5MvbGapWuMPKynzXkWJQYmG-PVN6Oc1m7i55HgcXFtyF1Lqwxrm5WR56vAcAQA3E0J2MIlRHsZbEVZtYLm36OOBfLRU2oJp8XhTr7FcwWf0uRPhn2lodezIq0IC0xgiUy6n_8c61VqyITp7NGcO7Q68uvIll0I")' }}></div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-900 dark:text-slate-100 text-base font-semibold">Maria Souza</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">Concluído</span>
                  </div>
                  <p className="text-primary text-xs font-medium mb-1">Faxina Residencial</p>
                  <div className="flex items-center gap-1 mb-1">
                    <StarRating rating={4} size={14} />
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1">(Sua avaliação)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">02 de Outubro, 2023 • Ref. #7921</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onNavigate('profile')} className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-semibold transition hover:bg-primary/90 active:scale-[0.98]">
                  Contratar Novamente
                </button>
                <button onClick={() => onNavigate('serviceStatus')} className="flex items-center justify-center rounded-lg h-10 w-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </button>
              </div>
            </div>

            {/* Service Entry 3 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm opacity-80 hover:shadow-md transition-shadow hover:opacity-100">
              <div className="flex gap-4 items-start">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAiWo7BTsgXciUbn94BPbrZ037vJW92scI5r0FW_b_XqH4ZJmpQwWvCVHJXQwBzQIlc083ihDq93LFnDILO7K15IYYumVIbCqRGawb1R1va4yP5qTfL4cGnMQYIFbWtrOnWoOOKHIAz__nqymvDO2UCcDEJNxN39nwzy4DQ_JGhVFnyz3hWQeJATuAGO1LQevcyVyYzjxpQMFf8I6_zcpkuW2uErGS-Jg5YrZQ1fL0o_-cKqKiNKh16a-_yaeON0XEos05Xy5w6Ovs")' }}></div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-900 dark:text-slate-100 text-base font-semibold">Ricardo Lima</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">Concluído</span>
                  </div>
                  <p className="text-primary text-xs font-medium mb-1">Eletricista</p>
                  <div className="flex items-center gap-1 mb-1">
                    <StarRating rating={5} size={14} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">20 de Setembro, 2023 • Ref. #6455</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onNavigate('profile')} className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-semibold transition hover:bg-primary/90 active:scale-[0.98]">
                  Contratar Novamente
                </button>
                <button onClick={() => onNavigate('serviceStatus')} className="flex items-center justify-center rounded-lg h-10 w-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </button>
              </div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
