/**
 * Cidade como parâmetro de primeira classe.
 *
 * A plataforma nasceu focada em Rondonópolis/MT, mas a cidade não deve estar
 * escrita no meio das telas. Tudo que depende dela — rótulo padrão, estado da
 * federação, placeholder de formulário, saudação da MAIA — sai daqui.
 *
 * Para lançar em outra praça, muda-se `DEFAULT_CITY` (ou a env
 * VITE_DEFAULT_CITY) e nada mais.
 */

import { normalizeText } from './formatters';

export interface City {
  /** Nome da cidade sem a UF. Ex: 'Rondonópolis' */
  name: string;
  /** Sigla da unidade federativa. Ex: 'MT' */
  state: string;
  /** Forma canônica usada no banco e nos filtros. Ex: 'Rondonópolis/MT' */
  slug: string;
}

const STORAGE_KEY = 'KNGindica_manualCity';

const RAW_DEFAULT = (import.meta.env.VITE_DEFAULT_CITY as string | undefined) || 'Rondonópolis/MT';

/** Divide 'Cidade/UF' em partes. Aceita entrada sem UF. */
export const parseCity = (value: string | null | undefined): City | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [name, state = ''] = trimmed.split('/').map((p) => p.trim());
  if (!name) return null;
  return { name, state, slug: state ? `${name}/${state}` : name };
};

export const DEFAULT_CITY: City = parseCity(RAW_DEFAULT) ?? {
  name: 'Rondonópolis',
  state: 'MT',
  slug: 'Rondonópolis/MT',
};

/** Cidade escolhida pelo usuário, ou null se ele ainda não escolheu. */
export const getSelectedCity = (): City | null => {
  try {
    return parseCity(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

/** Cidade escolhida, caindo no padrão da praça quando não há escolha. */
export const getCityOrDefault = (): City => getSelectedCity() ?? DEFAULT_CITY;

export const setSelectedCity = (value: string | null) => {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* modo privado / storage indisponível: seguimos com o padrão */
  }
};

/** Placeholder de formulário, sempre coerente com a praça configurada. */
export const cityPlaceholder = (): string => `Ex: ${DEFAULT_CITY.slug}`;

/** Compara cidades ignorando UF, acentos e caixa. */
export const isSameCity = (a: string | null | undefined, b: string | null | undefined): boolean => {
  const norm = (v: string | null | undefined) => normalizeText(parseCity(v)?.name ?? '');
  const na = norm(a);
  return !!na && na === norm(b);
};
