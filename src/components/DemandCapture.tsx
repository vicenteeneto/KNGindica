import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { getCityOrDefault } from '../lib/city';

interface DemandCaptureProps {
  /** O que a pessoa procurava — categoria escolhida ou termo buscado. */
  servico: string;
  /** Cidade da busca; cai na praça configurada quando ausente. */
  city?: string | null;
}

const onlyDigits = (v: string) => v.replace(/\D/g, '');

const maskPhone = (value: string) => {
  const v = onlyDigits(value).slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

/**
 * Mostrado quando uma busca não retorna nenhum prestador.
 *
 * O catálogo tem 60 categorias e oferta em poucas delas, então a maioria das
 * buscas terminava numa tela vazia — o cliente ia embora e a plataforma não
 * ficava sabendo do que precisava. Aqui a busca frustrada vira demanda
 * registrada em `service_demand_requests`, a mesma tabela que o fluxo do
 * WhatsApp já alimenta, servindo de lista de prospecção.
 */
export default function DemandCapture({ servico, city }: DemandCaptureProps) {
  const { profile } = useAuth();
  const { showToast } = useNotifications();
  const [phone, setPhone] = useState(() => maskPhone(profile?.phone ?? ''));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const cidade = city?.trim() || getCityOrDefault().name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = onlyDigits(phone);
    if (digits.length < 10) {
      showToast('Telefone incompleto', 'Informe o número com DDD para avisarmos você.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('service_demand_requests').insert({
        client_phone: digits,
        city: cidade,
        servico: servico || 'Não especificado',
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      console.error('Falha ao registrar demanda:', err);
      showToast('Erro', 'Não conseguimos registrar agora. Tente novamente em instantes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
        <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2 block">check_circle</span>
        <p className="font-black text-white mb-1">Anotado!</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Assim que tivermos {servico ? <strong className="text-white">{servico}</strong> : 'esse serviço'} em {cidade}, avisamos você no WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="text-center mb-5">
        <span className="material-symbols-outlined text-4xl text-primary mb-2 block">notifications_active</span>
        <p className="font-black text-white mb-1">Ainda não temos esse profissional aqui</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Deixe seu WhatsApp e avisamos assim que{' '}
          {servico ? <strong className="text-white">{servico}</strong> : 'o serviço'} estiver disponível em {cidade}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          placeholder="(66) 99999-9999"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 disabled:opacity-60 transition-all"
        >
          {saving ? 'Registrando...' : 'Quero ser avisado'}
        </button>
      </form>
    </div>
  );
}
