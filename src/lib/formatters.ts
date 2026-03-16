export const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const parseCurrency = (value: string): number => {
  // Removes everything except digits
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return 0;
  return parseInt(cleanValue) / 100;
};

export const maskCurrency = (value: string): string => {
  const num = parseCurrency(value);
  return formatCurrency(num);
};
