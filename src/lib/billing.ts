export const CLIENT_GUARANTEE_FEE = 9.90;
export const PROVIDER_FREE_FEE_PERCENT = 0.05;
export const PROVIDER_FREE_MIN_FEE = 9.90;
export const PROVIDER_FREE_MAX_FEE = 50.00;
export const PREMIUM_PLAN_PRICE = 39.90;

export interface BillingSummary {
  grossAmount: number;
  clientFee: number;
  clientTotal: number;
  providerFee: number;
  providerNet: number;
  isPremium: boolean;
}

/**
 * Calcula o detalhamento de taxas para um serviço com garantia
 * @param amount Valor bruto do serviço combinado
 * @param planType Tipo de plano do prestador ('basic' ou 'plus')
 * @returns BillingSummary
 */
export const calculateServiceFees = (amount: number, planType: 'basic' | 'plus' | null | undefined): BillingSummary => {
  const isPremium = planType === 'plus';
  
  // Taxa do Cliente é sempre fixa em R$ 9,90 para serviços com garantia
  const clientFee = CLIENT_GUARANTEE_FEE;
  const clientTotal = amount + clientFee;
  
  let providerFee = 0;
  if (!isPremium) {
    // Prestador FREE paga 5%, com piso de 9,90 e teto de 50,00
    providerFee = amount * PROVIDER_FREE_FEE_PERCENT;
    if (providerFee < PROVIDER_FREE_MIN_FEE) providerFee = PROVIDER_FREE_MIN_FEE;
    if (providerFee > PROVIDER_FREE_MAX_FEE) providerFee = PROVIDER_FREE_MAX_FEE;
    
    // A taxa não pode ser maior que o próprio serviço (caso de serviços muito baratos)
    if (providerFee > amount) providerFee = amount;
  }
  
  const providerNet = amount - providerFee;
  
  return {
    grossAmount: amount,
    clientFee,
    clientTotal,
    providerFee,
    providerNet,
    isPremium
  };
};
