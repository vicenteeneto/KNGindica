# KNGindica

Plataforma de **indicação inteligente de prestadores de serviço**. O cliente descreve o que precisa e a plataforma recomenda os profissionais mais adequados; o prestador recebe pedidos, negocia por chat e executa o serviço.

Cidade inicial: **Rondonópolis/MT**. A arquitetura é preparada para expansão nacional.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vite 6 · React 19 · TypeScript 5.8 · TailwindCSS 4 |
| Backend | Supabase (Postgres + Auth + RLS + Storage + Realtime + Edge Functions) |
| IA | Google Gemini via Edge Function `maia-chat` |
| Mapas | Leaflet + react-leaflet |
| Push | OneSignal (Web SDK v16) |
| Deploy | Vercel |

---

## Rodando localmente

**Pré-requisitos:** Node.js 20+

```bash
npm install
```

Crie um `.env` na raiz a partir do exemplo:

```bash
cp .env.example .env
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Dashboard do Supabase → Project Settings → API). **O app não sobe sem essas duas variáveis** — não há mais fallback com credenciais no código-fonte.

```bash
npm run dev
```

Abre em `http://localhost:3000`.

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | Checagem de tipos (`tsc --noEmit`) |
| `npm run check` | Valida os padrões do `.cursorrules` (proíbe `uppercase`) |

Os três últimos rodam no CI a cada push e pull request (`.github/workflows/ci.yml`).

---

## Organização

```
src/
  App.tsx              Roteamento por estado + lazy loading das telas
  AuthContext.tsx      Sessão, perfil e papel do usuário (client/provider/admin)
  NotificationContext  Toasts, modais, contadores e realtime
  ThemeContext.tsx     Tema claro/escuro
  screens/             38 telas (uma por rota lógica)
  components/          Componentes reutilizáveis (TabBar, StarRating, ...)
  lib/                 supabase, billing, formatters, OneSignalService
  hooks/               Hooks compartilhados
  types.ts             Tipos de domínio e o union `Screen`

supabase/
  migrations/          Migrations SQL (ver aviso abaixo)
  functions/maia-chat/ Edge Function da MAIA (Deno)
```

### Navegação

Não há react-router. `App.tsx` mantém `currentScreen` em estado, persiste em `localStorage` e sincroniza com `history.pushState` para o botão voltar do navegador. Cada tela é carregada sob demanda via `React.lazy`.

Único deep link: `/search/:id` → `WhatsAppSearchScreen`.

---

## Monetização

Toda a regra de taxas vive em **`src/lib/billing.ts`** — é a única fonte de verdade. Não escreva valores de taxa em telas.

| Plano | Mensalidade | Taxa por serviço |
|---|---|---|
| Prestador gratuito | — | R$ 10,00 por serviço intermediado |
| Prestador afiliado | R$ 39,90/mês | Isento |

O cliente não paga taxa.

---

## ⚠️ Estado do schema do banco

O schema base foi criado direto no painel do Supabase e nunca foi versionado. `20260728000000_baseline_schema.sql` reconstrói as 30 tabelas por introspecção do PostgREST, mas a introspecção **não enxerga** políticas RLS, índices, triggers, CHECK/UNIQUE constraints, corpos de função nem definições de view.

Para um dump fiel, rode com a CLI logada e substitua a baseline pelo resultado:

```bash
supabase link --project-ref yhtrvhievhrgmzijgpkk
supabase db pull
```

### Migrations pendentes de aplicação

`20260728000100` e `20260728000200` foram escritas mas **ainda não aplicadas**. Aplique em staging antes da produção.

---

## Integração WhatsApp (fora deste repositório)

O funil do WhatsApp existe e está ativo, mas **não vive aqui** — roda num fluxo **n8n** que escreve direto no banco:

| Tabela | Papel |
|---|---|
| `whatsapp_searches` | Origem do deep link `/search/:id` consumido por `WhatsAppSearchScreen` |
| `service_demand_requests` | Demanda capturada quando não há prestador para o serviço pedido |
| `n8n_chat_histories_kngindica` | Memória de conversa do agente |
| `blocked_numbers` / `rate_limit_events` | Bloqueio e rate limit por telefone |

RPCs consumidas por esse fluxo e por nenhuma tela: `get_professionals_for_maia`, `get_categories_for_prompt`, `search_providers`, `search_providers_fallback`, `block_number`, `is_number_blocked`.

**Consequência:** mudanças de schema neste repositório podem quebrar o n8n silenciosamente. O workflow do n8n deveria ser exportado e versionado aqui.

---

## Pendências conhecidas

- Schema base só parcialmente versionado (acima); rodar `supabase db pull`
- Pagamento é simulado — não há gateway; o status vai para `paid` a partir do cliente
- `pricing_model` tem dois vocabulários conflitantes gravados nos mesmos registros: o formulário grava `visit|hour|service|quote`, as comparações usam `hourly|negotiable`. Hoje há dados com `hourly`, `service`, `quote` e `negotiable` na mesma coluna
- `get_providers_within_radius` e `get_providers_nearby` coexistem fazendo a mesma coisa
- `AdminDashboardScreen.tsx` tem ~4.000 linhas numa única função, com 47 `useState` e 13 abas
- Cidade ainda não é parâmetro de primeira classe (textos fixos em Rondonópolis)
