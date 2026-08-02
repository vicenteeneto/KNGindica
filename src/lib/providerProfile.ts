/**
 * Regra única de "perfil de prestador está pronto para aparecer".
 *
 * Motivo: hoje existem prestadores cadastrados sem cidade, sem categoria e sem
 * preço — eles ocupam espaço nas listagens sem oferecer nada ao cliente, e o
 * próprio prestador não sabe que está invisível na prática. A checagem estava
 * duplicada e implícita no ProviderDashboard; agora é uma só.
 */

import { isQuoteOnly } from './pricing';

export interface ProviderProfileLike {
  city?: string | null;
  categories?: unknown;
  bio?: string | null;
  avatar_url?: string | null;
  price_value?: number | null;
  pricing_model?: string | null;
  whatsapp_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const hasCategories = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : !!value;

/**
 * Considera-se precificação definida quando o prestador publicou um valor ou
 * escolheu deliberadamente "sob orçamento". O vocabulário legado é traduzido
 * em lib/pricing, então `negotiable` e `hourly` antigos continuam válidos.
 */
export const hasPricing = (p: ProviderProfileLike): boolean =>
  isQuoteOnly(p.pricing_model) || !!p.price_value;

/**
 * Requisitos mínimos para o prestador ser exibido a clientes.
 * Cada item vira uma pendência mostrada no painel dele.
 */
export const REQUIRED_FIELDS: Array<{
  key: string;
  label: string;
  isFilled: (p: ProviderProfileLike) => boolean;
}> = [
  { key: 'city', label: 'Cidade de atuação', isFilled: (p) => !!p.city },
  { key: 'categories', label: 'Categorias de serviço', isFilled: (p) => hasCategories(p.categories) },
  { key: 'pricing', label: 'Preço do serviço', isFilled: hasPricing },
  { key: 'bio', label: 'Descrição do seu trabalho', isFilled: (p) => (p.bio ?? '').trim().length >= 30 },
  { key: 'whatsapp', label: 'WhatsApp para contato', isFilled: (p) => !!(p.whatsapp_number ?? '').trim() },
];

/** Campos que faltam, em rótulos prontos para exibir. */
export const missingProfileFields = (p: ProviderProfileLike | null | undefined): string[] => {
  if (!p) return REQUIRED_FIELDS.map((f) => f.label);
  return REQUIRED_FIELDS.filter((f) => !f.isFilled(p)).map((f) => f.label);
};

/** Checklist completo cumprido — usado para elogiar/destacar, não para filtrar. */
export const isProfileComplete = (p: ProviderProfileLike | null | undefined): boolean =>
  missingProfileFields(p).length === 0;

/**
 * Mínimo para o perfil aparecer em listagens e buscas.
 *
 * Deliberadamente mais frouxo que o checklist: exigir tudo hoje esvaziaria o
 * catálogo, já que nenhum prestador preencheu WhatsApp. O objetivo aqui é
 * barrar o perfil fantasma — quem entrou pelo login social e nunca preencheu
 * nada — e não punir quem está em progresso.
 */
export const isListable = (p: ProviderProfileLike | null | undefined): boolean => {
  if (!p) return false;
  return !!p.city && hasCategories(p.categories) && !!(p.bio ?? '').trim();
};

/** 0 a 100 — usado na barra de progresso do painel do prestador. */
export const profileCompletionPercent = (p: ProviderProfileLike | null | undefined): number => {
  const filled = REQUIRED_FIELDS.length - missingProfileFields(p).length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
};
