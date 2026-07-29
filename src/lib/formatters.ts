export const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export const parseCurrency = (value: string): number => {
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return 0;
  // Converte para centavos e depois para decimal
  return parseInt(cleanValue) / 100;
};

export const maskCurrency = (value: string): string => {
  // Limita a 11 dígitos (999.999.999,99) para evitar valores absurdos
  const cleanValue = value.replace(/\D/g, '').slice(0, 11);
  if (!cleanValue) return '';
  const num = parseInt(cleanValue) / 100;
  return formatCurrency(num);
};

/**
 * Coage para número campos que chegam como número ou texto (rating, distance).
 * Retorna `fallback` quando o valor não é numérico (ex: 'N/A (Rondonópolis)').
 */
export const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  if (typeof value === 'number') return isNaN(value) ? fallback : value;
  if (typeof value !== 'string') return fallback;
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
};

export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};
