# Painel NFC-e

Dashboard multi-usuário de gastos a partir de **cupons fiscais (NFC-e)**, **planilhas xlsx** e **consulta da Nota Fiscal Paulista**. Login com qualquer conta Google — cada usuário tem seu próprio workspace isolado. Persistência em **Postgres** (Neon, serverless). Os únicos serviços externos chamados são:

- Consultas a `brasilapi.com.br` para enriquecer endereço de estabelecimentos
- Chamadas à API da Anthropic (`claude-haiku-4-5`) para gerar receitas a partir dos produtos comprados

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **@neondatabase/serverless** — Postgres (Neon) via HTTP, schema inicializado lazy
- **pdf-parse** — extração de texto dos PDFs de NFC-e
- **xlsx** — leitura de planilhas
- **recharts** — gráficos
- **qr-scanner** — leitor de QR Code no celular
- **@anthropic-ai/sdk** — geração de receitas com Claude

## Setup

```bash
cd dashboard-app
npm install
cp .env.example .env.local      # preencha DATABASE_URL e ANTHROPIC_API_KEY
```

`DATABASE_URL`: crie um projeto grátis no [Neon](https://neon.tech), copie a connection string "pooled" (sufixo `-pooler`) com `?sslmode=require`. O schema é criado no primeiro acesso ao banco.

`AUTH_SECRET`: gere com `openssl rand -base64 32`. Em prod, marque a var nos 3 ambientes (Production/Preview/Development) com o **mesmo valor** — secret diferente entre ambientes quebra o cookie PKCE do OAuth.

`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: credenciais OAuth do Google Cloud Console. No console do Google, adicione `https://SEU_DOMINIO/api/auth/callback/google` (uma entrada por domínio que você usa) nas Authorized redirect URIs.

`ANTHROPIC_API_KEY`: opcional, só pra `/receitas` e categorização IA da `/lista-compras`.

> **Não configure `AUTH_URL`** em prod — sem ela, Auth.js v5 detecta a origem da request via `x-forwarded-host` e cada domínio (custom + preview .vercel.app) funciona com seu próprio callback. Setar `AUTH_URL` força um único callback e quebra o login nos outros domínios.

## Como rodar

```bash
npm run dev
```

Abre em `http://localhost:3000`. O banco e a pasta `data/` são criados automaticamente no primeiro upload.

### Acesso pelo celular na mesma rede

O IP local já está liberado em `next.config.ts` via `allowedDevOrigins: ["192.168.15.2"]`. Se seu IP for diferente, ajuste lá. Acesse `http://SEU_IP:3000`.

### Acesso HTTPS (necessário para o leitor de QR Code)

`getUserMedia` só funciona em HTTPS fora de `localhost`. Pra usar o scanner no celular, exponha via [ngrok](https://ngrok.com):

```bash
# uma vez: cadastre seu authtoken
ngrok config add-authtoken SEU_TOKEN

# tunnel pro Next em :3000
ngrok http 3000
```

A URL `https://*.ngrok-free.dev` já está liberada em `allowedDevOrigins`. Abra a URL pública do ngrok no celular.

## Fontes de dados aceitas

| Formato | O que traz | Origem típica |
| --- | --- | --- |
| **PDF** (`.pdf`) | Cabeçalho + **itens detalhados** + chave de acesso (44 dígitos) + endereço completo | NFC-e baixada do site da Fazenda SP |
| **XLSX** (`.xlsx`) | Cabeçalho + **itens detalhados** (sem chave de acesso, sem endereço) | Planilha consolidada manualmente |
| **CSV NFP** (`.csv`) | **Só cabeçalho** + créditos da Nota Fiscal Paulista (sem itens, sem endereço) | "Consulta NFP" do portal da Fazenda SP, UTF-16 LE |

### Deduplicação no upload

Notas são identificadas por **`chave_acesso` (se disponível)** ou pelo par **`(cnpj, numero)`**. Uploads duplicados retornam `action: "skipped"` por nota e não tocam no DB. Veja `lib/db.ts` → `upsertNota`.

## Páginas

| Rota | Auth | O que faz |
| --- | --- | --- |
| `/` | público | Landing page do produto (hero, recursos, screenshots, CTA "Entrar"). Se já logado, redireciona pra `/dashboard`. |
| `/login` | público | Botão de login com Google. Pós-login vai pra `/dashboard`. |
| `/dashboard` | auth | Dashboard principal: KPIs, gráfico "Gasto por compra/mês" (clicável → abre modal com as notas), top produtos, evolução de preço, créditos NFP, upload e scanner de QR. |
| `/precos` | auth | Comparador de preço por produto recorrente — preço médio por mês e por dia da semana, melhor mês destacado. |
| `/lista-compras` | auth | Categorias recorrentes (presentes em 2+ notas) como checklist interativo. Estado marcado fica salvo no aparelho. |
| `/receitas` | auth | Receitas geradas por Claude Haiku 4.5 a partir dos produtos das **últimas 3 notas com itens** do usuário. Cache por hash do `userId + produtos`. |
| `/contato` | auth | Página estática com canais de contato. |

## API

| Método | Rota | O que faz |
| --- | --- | --- |
| `GET` | `/api/notas` | Retorna todas as notas com itens aninhados (`force-dynamic`). |
| `POST` | `/api/upload` | Multipart com campo `file` (1 ou mais). Detecta tipo por extensão (`.pdf` / `.xlsx`/`.xls` / `.csv`) e roteia para o parser correspondente. PDFs também upsertam estabelecimento via parser local. |
| `GET` | `/api/recipes` | Server-side: lê últimas 3 notas com itens, chama Claude, retorna `{payload, cached}`. `?force=1` ignora o cache de processo. |
| `GET` / `POST` | `/api/estabelecimentos/sync` | Itera CNPJs sem registro de endereço, consulta `brasilapi.com.br/api/cnpj/v1/{cnpj}` (sequencial, 500 ms de delay) e popula `estabelecimentos` com `fonte: "BRASIL_API"`. |

## Schema do banco

```sql
users (
  id, email (UNIQUE), name, created_at
)

notas (
  id, user_id (FK → users), numero, serie, data_emissao, emitente, cnpj,
  valor_total, chave_acesso, creditos, situacao_credito,
  fonte ('PDF' | 'XLSX' | 'NFP'), created_at,
  UNIQUE (user_id, chave_acesso) WHERE chave_acesso IS NOT NULL,
  UNIQUE (user_id, cnpj, numero) WHERE cnpj IS NOT NULL
)

itens (
  id, nota_id (FK → notas), produto, codigo, qt, un, vu, vt
)

estabelecimentos (                -- tabela global, não por usuário
  cnpj (PK, só dígitos),
  razao_social, nome_fantasia,
  logradouro, numero, complemento, bairro, municipio, uf, cep,
  latitude, longitude,            -- reservadas pra geocoding futuro
  fonte ('PDF' | 'BRASIL_API'),
  updated_at
)

produto_categorias (              -- tabela global, cache do classificador IA
  produto (PK), categoria, fonte, criado_em
)
```

**Isolamento multi-user:** toda query em `notas`/`itens` filtra por `user_id` (via JOIN quando vem de `itens`). `estabelecimentos` e `produto_categorias` são globais por design — endereço de CNPJ e mapeamento produto→categoria não dependem de quem comprou, e compartilhar evita chamadas duplicadas a BrasilAPI/Anthropic.

CNPJ é gravado **formatado nas notas** (`93.209.765/0697-45`) e **só dígitos em estabelecimentos** (`93209765069745`). Use `cnpjDigits()` de `lib/db.ts` quando precisar comparar.

## Comandos úteis

### Migrar dados do SQLite antigo

Se você tem um `data/notas.db` herdado da versão anterior, rode uma vez:

```bash
DATABASE_URL='postgres://...neon.tech/...?sslmode=require' \
  npx tsx scripts/migrate-from-sqlite.ts
```

Idempotente: notas já existentes (por `chave_acesso` ou `(cnpj, numero)`) são puladas.

### Apagar todos os dados do banco

> ⚠️ Operação destrutiva. Confirme antes de rodar.

No console SQL do Neon (ou via `psql`):

```sql
TRUNCATE itens, notas RESTART IDENTITY CASCADE;
TRUNCATE estabelecimentos;
TRUNCATE users RESTART IDENTITY CASCADE;
```

Para apagar **só os dados de um usuário** (sem afetar os outros):

```sql
DELETE FROM notas WHERE user_id = (SELECT id FROM users WHERE email = 'fulano@example.com');
DELETE FROM users WHERE email = 'fulano@example.com';
```

`itens` é removido em cascade via FK.

### Sincronizar endereços (BrasilAPI)

```bash
curl -X POST http://localhost:3000/api/estabelecimentos/sync
```

Demora ~500 ms por CNPJ novo. Idempotente — só consulta CNPJs ainda sem endereço.

### Upload via curl (útil pra testes)

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@../Compras/SUA_NOTA.pdf" \
  -F "file=@../cupons_fiscais.xlsx"
```

### Inspecionar o banco

Use o **SQL Editor** do Neon (web), ou `psql` apontando para `DATABASE_URL`.

## Estrutura do código

```
dashboard-app/
├── app/
│   ├── layout.tsx              # raiz + Menu sandwich (só renderiza quando logado)
│   ├── page.tsx                # landing pública; redireciona pra /dashboard se logado
│   ├── LandingScreenshot.tsx   # client: preview compacto + lightbox da screenshot do hero
│   ├── Dashboard.tsx           # client: KPIs, gráficos, tabelas
│   ├── UploadDropzone.tsx      # drag&drop + scanner button
│   ├── QrScanButton.tsx        # leitor de QR Code (camera)
│   ├── MonthNotasModal.tsx     # modal de notas do mês selecionado
│   ├── Menu.tsx                # menu sandwich flutuante
│   ├── SearchableSelect.tsx    # combobox usado em /precos
│   ├── login/page.tsx          # server action: signIn("google")
│   ├── dashboard/page.tsx      # server: auth + getDashboardData(userId)
│   ├── precos/                 # comparador de preço por período
│   ├── lista-compras/          # checklist por categoria
│   ├── receitas/               # geração de receitas
│   ├── contato/page.tsx
│   └── api/
│       ├── auth/[...nextauth]  # handlers do NextAuth
│       ├── upload/route.ts     # multipart, escopa por userId
│       ├── notas/route.ts      # GET das notas do userId logado
│       ├── recipes/route.ts
│       └── estabelecimentos/sync/route.ts
├── lib/
│   ├── db.ts                   # Neon Postgres, schema lazy, upserts (user-scoped)
│   ├── parseNfce.ts            # PDF NFC-e → ParsedNota (com endereço)
│   ├── parseXlsx.ts            # planilha → ParsedNota[]
│   ├── parseNfpCsv.ts          # CSV UTF-16 → ParsedNota[] (header-only)
│   ├── categorizar.ts          # dicionário + classificador IA (Anthropic)
│   ├── brasilapi.ts            # cliente BrasilAPI com cache em memória
│   └── recipes.ts              # gerador de receitas (Claude Haiku 4.5)
├── scripts/
│   └── migrate-from-sqlite.ts  # importa data/notas.db antigo para o Neon
├── auth.config.ts              # edge-safe: providers + session + pages (importado pelo middleware)
├── auth.ts                     # full config: callbacks que tocam o DB (signIn/jwt/session)
├── middleware.ts               # protege todas as rotas exceto /, /login, /api/auth, assets
├── next.config.ts              # serverExternalPackages + allowedDevOrigins
└── .env.local                  # DATABASE_URL + AUTH_SECRET + Google OAuth + ANTHROPIC_API_KEY (gitignored)
```

### Auth: split config

`auth.config.ts` é **Edge-safe** (sem imports do `lib/db.ts`) e é importado pelo `middleware.ts`, que roda no Edge runtime do Vercel. `auth.ts` faz `{ ...authConfig, callbacks: { ... } }` e adiciona os callbacks que precisam do banco (`signIn` faz upsert do usuário, `jwt` carrega `uid`, `session` expõe `user.id`). Esse split é o que evita o erro `Edge Function referencing unsupported modules` que ocorre se o middleware indiretamente importar `node:fs`, drivers de banco, etc.

## Decisões de design relevantes

- **CSV NFP gera notas header-only** (sem itens) e participa do "Total gasto" / "Gasto por mês". Para features que dependem de produto (top, evolução, comparação, receitas), só notas com itens são consideradas.
- **Receitas usam as 3 notas com itens mais recentes** (ordenadas por `created_at DESC`), não as 3 últimas em geral — evita o caso de só ter NFP-only recente sem dados úteis.
- **Estabelecimentos via PDF não são sobrescritos por BrasilAPI**? Na verdade, o oposto: dados de `BRASIL_API` são preferidos quando existem (têm CEP e estão prontos pra geocoding). Veja a lógica em `upsertEstabelecimento`.
- **Cache de receitas** vive em `globalThis` (sobrevive entre requests do dev server, morre em cold start de serverless). Hash é SHA-256 do `produtos.join("\n")` ordenado.
- **Custo do Claude por geração de receita**: ~R$ 0,02–0,06 com Haiku 4.5. O system prompt é cacheado (`cache_control: ephemeral`) — chamadas repetidas com o mesmo prompt pagam ~0,1× nos tokens de sistema.

## Roadmap

Itens com infraestrutura já no DB, esperando UI/serviço externo:

- **Mapa de estabelecimentos**: campos `latitude` / `longitude` em `estabelecimentos` estão prontos. Falta (a) geocoder (Nominatim/OSM grátis ou Mapbox) e (b) componente de mapa (Leaflet).
- **Leitor de QR Code → cadastra nota**: hoje o scanner só redireciona pro portal da Fazenda. Captura de itens via OCR/visão IA da foto do cupom é viável (~R$ 0,05/foto com Claude Vision) — ver discussão em conversas anteriores.

## Troubleshooting

- **Charts não aparecem em mobile via IP**: confirme se o IP está em `allowedDevOrigins` no `next.config.ts`. Next 16 bloqueia chunks JS de origens não-listadas com 403.
- **`/receitas` mostra "Configure a API key"**: crie `.env.local` com `ANTHROPIC_API_KEY=` e **reinicie o dev server** (env vars são lidas no boot).
- **`/api/estabelecimentos/sync` retorna 403**: BrasilAPI bloqueia o User-Agent default do `fetch` do Node. O cliente em `lib/brasilapi.ts` já injeta um UA custom — se voltar a quebrar, mude o UA.
- **Erro de hidratação por extensão de browser** (Grammarly, ColorZilla, etc.): já tratado com `suppressHydrationWarning` no `<body>` em `app/layout.tsx`.
- **DB parece "fantasma"** depois de wipe: o dev server tem handle aberto via WAL. Rode `wal_checkpoint(TRUNCATE)` no script de wipe ou reinicie o `npm run dev`.
