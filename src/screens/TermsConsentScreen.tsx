import React, { useState, useRef, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';

export default function TermsConsentScreen({ onNavigate }: NavigationProps) {
  const { user, profile } = useAuth();
  const { showToast } = useNotifications();
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If user reached within 40px of the bottom
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        setIsScrolledToEnd(true);
      }
    }
  };

  const handleAccept = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Navigate to home after acceptance
      onNavigate('home');
      window.location.reload(); // Force refresh context
    } catch (e) {
      console.error("Erro ao aceitar termos:", e);
      showToast("Erro", "Houve um problema ao salvar seu aceite. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 text-center">
          <div className="inline-flex size-14 bg-primary/10 rounded-2xl items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">gavel</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            TERMO DE USO E POLÍTICA DE PRIVACIDADE
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            Plataforma KNGIndica — Última atualização: 19/02/2026
          </p>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed custom-scrollbar"
        >
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-8">
            <p className="text-primary font-bold text-center">
              Por favor, leia atentamente os termos abaixo e role até o fim para continuar.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. SOBRE A PLATAFORMA</h2>
            <p>
              A KNGIndica é uma plataforma digital que conecta pessoas que desejam contratar serviços (“Solicitantes”) a prestadores de serviços (“Prestadores”), com o objetivo de facilitar a busca, a comunicação e a contratação de serviços de forma mais organizada, segura e prática.
            </p>
            <p className="mt-2">
              A KNGIndica atua exclusivamente como intermediadora de contatos, não sendo responsável pela execução dos serviços contratados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. ACEITAÇÃO DOS TERMOS</h2>
            <p>
              Ao acessar ou utilizar a plataforma, o usuário declara que leu, entendeu e concorda com este Termo de Uso e com a Política de Privacidade.
            </p>
            <p className="mt-2 italic">
              Caso não concorde, o uso da plataforma não deve ser realizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. CADASTRO E RESPONSABILIDADE DO USUÁRIO</h2>
            <p>
              Para utilizar a plataforma, o usuário deverá fornecer informações verdadeiras, completas e atualizadas.
            </p>
            <p className="mt-4 font-bold">O usuário declara que:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Possui pelo menos 18 anos</li>
              <li>É responsável pelas informações fornecidas</li>
              <li>Não utilizará a plataforma para fins ilegais</li>
            </ul>
            <p className="mt-4 text-xs">A KNGIndica não se responsabiliza por dados incorretos fornecidos pelos usuários.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">4. TIPOS DE USUÁRIO</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-primary">4.1 Solicitantes</h3>
                <p>Usuários que buscam contratar serviços.</p>
              </div>
              <div>
                <h3 className="font-bold text-primary">4.2 Prestadores de Serviço</h3>
                <p>Profissionais ou empresas que oferecem serviços na plataforma, podendo ser:</p>
                <ul className="mt-2 space-y-2">
                  <li className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    <strong>Plano Básico:</strong> acesso ao cadastro e chat interno
                  </li>
                  <li className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    <strong>Plano Plus:</strong> mediante assinatura mensal, com benefícios adicionais como maior visibilidade e contato direto via WhatsApp
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">5. FUNCIONAMENTO DA PLATAFORMA</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              {['Busca por categoria', 'Assistente Maia', 'Exibição de perfis', 'Chat interno', 'WhatsApp direto', 'Avaliações', 'Rastreamento de leads'].map(item => (
                <li key={item} className="flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                   {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">6. NATUREZA DA RESPONSABILIDADE</h2>
            <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-4 rounded-r-xl">
              <p className="font-bold text-red-700 dark:text-red-400 mb-2">A KNGIndica:</p>
              <ul className="list-disc ml-5 space-y-1 text-red-600 dark:text-red-300/80">
                <li>Não presta serviços diretamente</li>
                <li>Não garante a qualidade dos serviços</li>
                <li>Não participa da execução dos serviços contratados</li>
              </ul>
              <p className="mt-3 font-bold text-red-700 dark:text-red-400">
                Toda negociação, execução e responsabilidade sobre o serviço são exclusivamente entre Solicitante e Prestador.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">7. AVALIAÇÕES E CONTEÚDO DOS USUÁRIOS</h2>
            <p>
              Usuários podem avaliar serviços prestados. Ao publicar avaliações, o usuário declara que as informações são verdadeiras e não há conteúdo ofensivo, ilegal ou difamatório.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">8. PLANOS, PAGAMENTOS E ASSINATURAS</h2>
            <p>
              Prestadores que aderirem ao plano Plus concordam com pagamento recorrente (mensal), possibilidade de alteração de valores mediante aviso prévio e cancelamento conforme regras definidas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">9. INTERMEDIAÇÃO DE PAGAMENTO</h2>
            <p>
              Em determinados casos, a KNGIndica poderá intermediar pagamentos. O valor poderá ser retido temporariamente e a liberação ocorrerá após a confirmação da execução do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">10. USO DA ASSISTENTE VIRTUAL (MAIA)</h2>
            <p>
              O usuário está ciente de que as respostas são automatizadas, podem ocorrer limitações ou imprecisões e a assistente não substitui avaliação humana.
            </p>
          </section>

          <section className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined">shield</span> 
              11. USO DE DADOS (POLÍTICA DE PRIVACIDADE)
            </h2>
            <div className="space-y-4">
               <div>
                 <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Dados coletados:</p>
                 <p className="text-sm">Nome, Telefone (WhatsApp), Localização, Informações de perfil, Histórico de interações e Conversas externas.</p>
               </div>
               <div>
                 <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Finalidade:</p>
                 <p className="text-sm">Conectar usuários, melhorar a experiência, garantir segurança e gerar métricas de rastreabilidade.</p>
               </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">12. SEGURANÇA DAS INFORMAÇÕES</h2>
            <p>
              A KNGIndica adota medidas de segurança para proteger os dados. No entanto, não é possível garantir segurança absoluta contra acessos indevidos ou ataques.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">13. DIREITOS DO USUÁRIO</h2>
            <p>
              O usuário pode solicitar acesso aos seus dados, corrigir informações ou solicitar exclusão da conta através dos canais de contato da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">14. CONDUTAS PROIBIDAS</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Utilizar a plataforma para atividades ilegais</li>
              <li>Fornecer informações falsas ou assediar outros usuários</li>
              <li>Tentar burlar o sistema ou usar a plataforma para fraudes</li>
            </ul>
          </section>

          <section>
             <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">15. SUSPENSÃO E CANCELAMENTO</h2>
             <p>A KNGIndica poderá suspender contas suspeitas ou excluir usuários que violem os termos sem aviso prévio em casos graves.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">16. LIMITAÇÃO DE RESPONSABILIDADE</h2>
            <p>A KNGIndica não se responsabiliza por danos causados entre usuários, perdas financeiras ou expectativas não atendidas em contratações de serviços de terceiros.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">17. ALTERAÇÕES NOS TERMOS</h2>
            <p>A KNGIndica poderá alterar este Termo a qualquer momento. O uso contínuo após alterações implica aceitação automática.</p>
          </section>

          <section className="pb-10 border-t border-slate-100 dark:border-slate-800 pt-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">18. FORO</h2>
            <p>Fica eleito o foro da comarca de Mato Grosso/Rondonópolis para resolução de eventuais conflitos.</p>
          </section>
        </div>

        {/* Action Area */}
        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          {!isScrolledToEnd && (
             <div className="flex items-center justify-center gap-2 text-primary font-bold animate-bounce text-sm">
                <span className="material-symbols-outlined">expand_more</span>
                Role até o final para aceitar
             </div>
          )}
          
          <button
            onClick={handleAccept}
            disabled={!isScrolledToEnd || loading}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
              isScrolledToEnd 
                ? 'bg-primary text-white hover:bg-primary-dark active:scale-95 shadow-primary/30' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Li e concordo com os termos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
