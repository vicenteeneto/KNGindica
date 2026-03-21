import React, { useState, useEffect } from 'react';

// Cache estático compartilhado para evitar múltiplas requisições
let cachedCities: string[] = [];
let citiesPromise: Promise<string[]> | null = null;

// Lista de backup (Capitais e maiores cidades de MT/Brasil) para garantir funcionamento instantâneo
const fallbackCities = [
  "São Paulo/SP", "Rio de Janeiro/RJ", "Brasília/DF", "Salvador/BA", "Fortaleza/CE",
  "Belo Horizonte/MG", "Manaus/AM", "Curitiba/PR", "Recife/PE", "Goiânia/GO",
  "Belém/PA", "Porto Alegre/RS", "Cuiabá/MT", "Rondonópolis/MT", "Várzea Grande/MT",
  "Sinop/MT", "Sorriso/MT", "Tangará da Serra/MT", "Primavera do Leste/MT",
  "Lucas do Rio Verde/MT", "Cáceres/MT", "Barra do Garças/MT", "Itiquira/MT",
  "Nova Mutum/MT", "Campo Novo do Parecis/MT", "Juína/MT", "Pontes e Lacerda/MT",
  "Alta Floresta/MT", "Guarantã do Norte/MT", "Poxoréu/MT", "Jaciara/MT",
  "Sapezal/MT", "Querência/MT", "Juara/MT", "Peixoto de Azevedo/MT", "Barra do Bugres/MT",
  "Colíder/MT", "Campo Verde/MT", "Poconé/MT", "Canarana/MT"
];

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
    (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  useEffect(() => {
    // Tenta carregar do localStorage primeiro
    if (cachedCities.length === 0) {
      try {
        const saved = localStorage.getItem('iservice_city_cache');
        if (saved) {
          cachedCities = JSON.parse(saved);
          console.log("Cache de cidades carregado do localStorage");
        }
      } catch (e) { console.error("Erro ao ler cache local:", e); }
    }

    if (cachedCities.length > 0) return;

    if (!citiesPromise) {
      setLoading(true);
      citiesPromise = fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data)) throw new Error("Resposta inválida do IBGE");
          
          const list = data.map((m: any) => {
            try {
              const uf = m?.microrregiao?.mesorregiao?.UF?.sigla || 
                         m?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla || 
                         '??';
              return `${m.nome}/${uf}`;
            } catch (e) { return null; }
          }).filter(Boolean) as string[];

          cachedCities = Array.from(new Set([...fallbackCities, ...list]));
          
          // Salva no localStorage para uso futuro (persiste entre reloads)
          try {
            localStorage.setItem('iservice_city_cache', JSON.stringify(cachedCities));
          } catch (e) { }

          setLoading(false);
          return cachedCities;
        })
        .catch(err => {
          console.error("Erro ao carregar cidades IBGE:", err);
          cachedCities = fallbackCities;
          setLoading(false);
          return fallbackCities;
        });
    } else {
      if (cachedCities.length === 0) {
        setLoading(true);
        citiesPromise.then(() => setLoading(false)).catch(() => setLoading(false));
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    const query = normalize(val);
    if (query.length >= 2) {
      // 1. Prioriza cidades ativas
      const activeMatch = activeCities.filter(c => normalize(c).includes(query));
      
      // 2. Busca no cache (IBGE + Fallback)
      const mainList = cachedCities.length > 0 ? cachedCities : fallbackCities;
      const ibgeMatch = mainList.filter(c => {
        const normCity = normalize(c);
        return normCity.includes(query) && !activeMatch.includes(c);
      });

      // Combina priorizando ativas
      const combined = [...activeMatch, ...ibgeMatch].slice(0, 10);
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
        onBlur={() => setTimeout(() => setSuggestions([]), 200)} // delay to allow clicks
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
      
      {(suggestions.length > 0 || (loading && value.length >= 2)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-1">
          {suggestions.map((s, idx) => (
            <button
              key={s + idx}
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
          
          {loading && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-2">
              <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest animate-pulse">
                Carregando base completa...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
