/**
 * Fonte única de verdade do modelo de monetização da KNGindica.
 *
 * Modelo híbrido:
 *   - Prestador gratuito : sem mensalidade, paga uma taxa fixa por serviço intermediado.
 *   - Prestador afiliado : mensalidade fixa, sem comissão por indicação.
 *   - Cliente            : não paga taxa.
 *
 * Antes desta unificação o projeto tinha três regras conflitantes espalhadas
 * (5% com piso/teto aqui, R$ 9,90 no checkout, R$ 10 fixo no chat e no admin).
 * Qualquer mudança de preço deve acontecer SOMENTE neste arquivo.
 */

/** Taxa fixa cobrada do prestador do plano gratuito por serviço intermediado. */
export const PROVIDER_INTERMEDIATION_FEE = 10.0;

/** Mensalidade do plano afiliado (isenta de comissão por serviço). */
export const PREMIUM_PLAN_PRICE = 39.9;

/**
 * Taxa cobrada do cliente. Zero no modelo atual.
 * O código anterior cobrava R$ 9,90 a título de "Garantia KNG"; se o produto
 * voltar a adotar essa cobrança, basta alterar este valor.
 */
export const CLIENT_GUARANTEE_FEE = 0;

export type PlanType = 'basic' | 'plus' | null | undefined;

export interface BillingSummary {
  /** Valor combinado do serviço, sem taxas. */
  grossAmount: number;
  /** Quanto o cliente paga além do valor do serviço. */
  clientFee: number;
  /** Total efetivamente cobrado do cliente. */
  clientTotal: number;
  /** Quanto a plataforma retém do prestador. */
  providerFee: number;
  /** Quanto o prestador recebe líquido. */
  providerNet: number;
  isPremium: boolean;
}

export const isPremiumPlan = (planType: PlanType): boolean => planType === 'plus';

/**
 * Calcula o detalhamento de taxas de um serviço.
 *
 * @param amount   Valor bruto combinado do serviço
 * @param planType Plano do prestador ('basic' | 'plus')
 */
export const calculateServiceFees = (amount: number, planType: PlanType): BillingSummary => {
  const grossAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const isPremium = isPremiumPlan(planType);

  const clientFee = CLIENT_GUARANTEE_FEE;
  const clientTotal = grossAmount + clientFee;

  // Afiliado não paga comissão. Gratuito paga a taxa fixa, nunca acima do
  // próprio valor do serviço (protege serviços muito baratos).
  const providerFee = isPremium ? 0 : Math.min(PROVIDER_INTERMEDIATION_FEE, grossAmount);

  return {
    grossAmount,
    clientFee,
    clientTotal,
    providerFee,
    providerNet: grossAmount - providerFee,
    isPremium,
  };
};
