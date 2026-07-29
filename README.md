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

`supabase/migrations/` contém apenas migrations **incrementais**. O schema base (as ~27 tabelas que o app consulta) foi criado direto no painel do Supabase e **não está versionado**.

Antes de qualquer mudança estrutural, extraia o schema atual:

```bash
supabase link --project-ref <ref>
supabase db pull
```

Enquanto isso não for feito, não existe ambiente de staging nem rollback possível.

---

## Pendências conhecidas

- Schema base não versionado (acima)
- 4 funções RPC chamadas pelo frontend não estão em `migrations/`: `get_providers_within_radius`, `get_unread_counts`, `delete_user_entirely`, `admin_remove_reward_points`
- Pagamento é simulado — não há gateway; o status vai para `paid` a partir do cliente
- Integração com WhatsApp não implementada: `WhatsAppSearchScreen` consome a tabela `whatsapp_searches`, mas nada a popula
- RLS de `profiles` é `USING (true)` — dados de contato ficam legíveis publicamente
- `pricing_model` tem dois vocabulários conflitantes (`visit|hour|service|quote` no formulário, `hourly|negotiable` nas comparações)
