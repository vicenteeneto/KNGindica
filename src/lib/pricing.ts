/**
 * Vocabulário único de precificação.
 *
 * O projeto tinha dois vocabulários gravados na MESMA coluna:
 *   - o formulário de perfil salvava  visit | hour | service | quote
 *   - as telas comparavam contra      hourly | negotiable
 *
 * Nenhum lado conhecia o outro, então o rótulo saía errado: um prestador com
 * `negotiable` caía no `else` e a tela anunciava "Valor fixo" logo abaixo de
 * "Sob Consulta".
 *
 * Aqui o vocabulário do formulário virou o canônico e os termos antigos são
 * traduzidos na leitura. Assim o app fica correto mesmo antes de a migration
 * de dados rodar, e continua correto se algum registro legado reaparecer.
 */

export type PricingModel = 'visit' | 'hour' | 'service' | 'quote';

export const PRICING_MODELS: Array<{ value: PricingModel; label: string; unit: string }> = [
  { value: 'visit', label: 'Por visita', unit: 'Por visita' },
  { value: 'hour', label: 'Por hora', unit: 'Por hora' },
  { value: 'service', label: 'Por serviço', unit: 'Valor fixo' },
  { value: 'quote', label: 'Sob orçamento', unit: 'Sob orçamento' },
];

/** Termos antigos → canônicos. `hourly` era o DEFAULT da coluna. */
const LEGADO: Record<string, PricingModel> = {
  hourly: 'hour',
  negotiable: 'quote',
  hora: 'hour',
  fixo: 'service',
};

export const normalizePricingModel = (raw: string | null | undefined): PricingModel => {
  const v = (raw ?? '').trim().toLowerCase();
  if (PRICING_MODELS.some((m) => m.value === v)) return v as PricingModel;
  return LEGADO[v] ?? 'quote';
};

/** Modelo em que não se publica valor — o preço é combinado. */
export const isQuoteOnly = (raw: string | null | undefined): boolean =>
  normalizePricingModel(raw) === 'quote';

export const pricingLabel = (raw: string | null | undefined): string =>
  PRICING_MODELS.find((m) => m.value === normalizePricingModel(raw))!.label;

/**
 * Rótulo da unidade exibido embaixo do preço.
 *
 * Sem valor publicado não existe unidade a anunciar: devolve 'Sob orçamento'
 * em vez de inventar "Valor fixo", que era exatamente o texto contraditório
 * que aparecia no perfil.
 */
export const pricingUnitLabel = (
  raw: string | null | undefined,
  priceValue: number | null | undefined
): string => {
  if (!priceValue || isQuoteOnly(raw)) return 'Sob orçamento';
  return PRICING_MODELS.find((m) => m.value === normalizePricingModel(raw))!.unit;
};

/** Há preço publicável? Usado para decidir entre valor e "Sob orçamento". */
export const hasPublishedPrice = (
  raw: string | null | undefined,
  priceValue: number | null | undefined,
  showPrice?: boolean | null
): boolean => showPrice !== false && !!priceValue && !isQuoteOnly(raw);
