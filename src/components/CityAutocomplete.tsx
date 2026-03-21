import React, { useState, useEffect } from 'react';

// Cache estático para evitar múltiplas requisições ao navegar entre telas
let cachedCities: string[] = [];
let isFetching = false;

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  activeCities?: string[]; // Cidades que já possuem prestadores
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Ex: Rondonópolis/MT", 
  className,
  inputRef,
  activeCities = []
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Função auxiliar de normalização robusta
  const normalize = (str: string) => 
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  useEffect(() => {
    // Busca todas as cidades do Brasil via IBGE se o cache estiver vazio
    if (cachedCities.length === 0 && !isFetching) {
      isFetching = true;
      setLoading(true);
      fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
        .then(res => res.json())
        .then(data => {
          cachedCities = data.map((m: any) => 
            `${m.nome}/${m.microrregiao.mesorregiao.UF.sigla}`
          );
          setLoading(false);
          isFetching = false;
        })
        .catch(err => {
          console.error("Erro ao carregar cidades IBGE:", err);
          isFetching = false;
          setLoading(false);
        });
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    const query = normalize(val);
    if (query.length >= 2) {
      // 1. Busca primeiro nas cidades ativas (prioridade)
      const activeMatch = activeCities.filter(c => normalize(c).includes(query));
      
      // 2. Busca no resto do IBGE
      const ibgeMatch = cachedCities.filter(c => {
        const normCity = normalize(c);
        return normCity.includes(query) && !activeMatch.includes(c);
      });

      // Combina priorizando ativas
      const combined = [...activeMatch, ...ibgeMatch].slice(0, 8);
      setSuggestions(combined);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault();
            const selected = suggestions[0];
            onChange(selected);
            setSuggestions([]);
            if (onSelect) onSelect(selected);
          }
        }}
      />
      
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-1">
          {suggestions.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onChange(s);
                setSuggestions([]);
                if (onSelect) onSelect(s);
              }}
              className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm opacity-50 group-hover:text-white">location_on</span>
                {s}
              </div>
              {activeCities.includes(s) && (
                <span className="text-[9px] uppercase font-black text-primary group-hover:text-white flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-primary group-hover:bg-white animate-pulse"></span>
                  Ativa
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      
      {loading && value.length >= 3 && cachedCities.length === 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};
