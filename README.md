# Painel NFC-e

Dashboard pessoal de gastos a partir de **cupons fiscais (NFC-e)**, **planilhas xlsx** e **consulta da Nota Fiscal Paulista**. Tudo roda local em SQLite — nada sobe pra serviços externos exceto:

- Consultas a `brasilapi.com.br` para enriquecer endereço de estabelecimentos
- Chamadas à API da Anthropic (`claude-haiku-4-5`) para gerar receitas a partir dos produtos comprados

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **better-sqlite3** — banco local em `data/notas.db`
- **pdf-parse** — extração de texto dos PDFs de NFC-e
- **xlsx** — leitura de planilhas
- **recharts** — gráficos
- **qr-scanner** — leitor de QR Code no celular
- **@anthropic-ai/sdk** — geração de receitas com Claude

## Setup

```bash
cd dashboard-app
npm install
```

Crie um `.env.local` (opcional, só para a página de receitas):

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

> `.env.local` e `data/` estão no `.gitignore` — chaves e o SQLite não vão pro repositório.

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

| Rota | O que faz |
| --- | --- |
| `/` | Dashboard principal: KPIs, gráfico "Gasto por compra/mês" (clicável no modo mês → abre modal com as notas), top produtos, evolução de preço, créditos NFP, tabelas de comparação e detalhe item-a-item, upload e scanner de QR |
| `/receitas` | Receitas geradas por Claude Haiku 4.5 a partir dos produtos das **últimas 3 notas com itens** (xlsx/PDF — NFP não conta porque não tem itens). Cache por hash do conjunto de produtos. |
| `/contato` | Página estática com canais de contato. |

## API

| Método | Rota | O que faz |
| --- | --- | --- |
| `GET` | `/api/notas` | Retorna todas as notas com itens aninhados (`force-dynamic`). |
| `POST` | `/api/upload` | Multipart com campo `file` (1 ou mais). Detecta tipo por extensão (`.pdf` / `.xlsx`/`.xls` / `.csv`) e roteia para o parser correspondente. PDFs também upsertam estabelecimento via parser local. |
| `GET` | `/api/recipes` | Server-side: lê últimas 3 notas com itens, chama Claude, retorna `{payload, cached}`. `?force=1` ignora o cache de processo. |
| `GET` / `POST` | `/api/estabelecimentos/sync` | Itera CNPJs sem registro de endereço, consulta `brasilapi.com.br/api/cnpj/v1/{cnpj}` (sequencial, 500 ms de delay) e popula `estabelecimentos` com `fonte: "BRASIL_API"`. |

## Schema do banco

```sql
notas (
  id, numero, serie, data_emissao, emitente, cnpj,
  valor_total, chave_acesso (UNIQUE), creditos, situacao_credito,
  fonte ('PDF' | 'XLSX' | 'NFP'), created_at,
  UNIQUE (cnpj, numero)
)

itens (
  id, nota_id (FK → notas), produto, codigo, qt, un, vu, vt
)

estabelecimentos (
  cnpj (PK, só dígitos),
  razao_social, nome_fantasia,
  logradouro, numero, complemento, bairro, municipio, uf, cep,
  latitude, longitude,        -- reservadas pra geocoding futuro
  fonte ('PDF' | 'BRASIL_API'),
  updated_at
)
```

CNPJ é gravado **formatado nas notas** (`93.209.765/0697-45`) e **só dígitos em estabelecimentos** (`93209765069745`). Use `cnpjDigits()` de `lib/db.ts` quando precisar comparar.

## Comandos úteis

### Apagar todos os dados do banco

> ⚠️ Operação destrutiva. Confirme antes de rodar.

Crie um script ad-hoc dentro de `dashboard-app/` e rode com `node`:

```js
// wipe.cjs
const Database = require("better-sqlite3");
const db = new Database("data/notas.db");
db.exec("DELETE FROM itens");
db.exec("DELETE FROM notas");
db.exec("DELETE FROM estabelecimentos");
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('notas','itens')");
db.pragma("wal_checkpoint(TRUNCATE)");
db.exec("VACUUM");
db.close();
```

```bash
node wipe.cjs && rm wipe.cjs
```

Se o dev server estiver rodando, a próxima requisição vê o estado vazio (handle reaberto via WAL).

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

```bash
sqlite3 data/notas.db
# ou via node:
node -e 'const db = require("better-sqlite3")("data/notas.db"); console.log(db.prepare("SELECT COUNT(*) c FROM notas").get());'
```

## Estrutura do código

```
dashboard-app/
├── app/
│   ├── layout.tsx              # raiz + Menu sandwich
│   ├── page.tsx                # server: lê DB e passa pro Dashboard
│   ├── Dashboard.tsx           # client: KPIs, gráficos, tabelas
│   ├── UploadDropzone.tsx      # drag&drop + scanner button
│   ├── QrScanButton.tsx        # leitor de QR Code (camera)
│   ├── MonthNotasModal.tsx     # modal de notas do mês selecionado
│   ├── Menu.tsx                # menu sandwich flutuante
│   ├── contato/page.tsx
│   ├── receitas/
│   │   ├── page.tsx            # server: chama gerarReceitas()
│   │   └── RefreshButton.tsx   # client: força regen via ?force=1
│   └── api/
│       ├── upload/route.ts
│       ├── notas/route.ts
│       ├── recipes/route.ts
│       └── estabelecimentos/sync/route.ts
├── lib/
│   ├── db.ts                   # SQLite, schema, upserts
│   ├── parseNfce.ts            # PDF NFC-e → ParsedNota (com endereço)
│   ├── parseXlsx.ts            # planilha → ParsedNota[]
│   ├── parseNfpCsv.ts          # CSV UTF-16 → ParsedNota[] (header-only)
│   ├── brasilapi.ts            # cliente BrasilAPI com cache em memória
│   └── recipes.ts              # gerador de receitas (Claude Haiku 4.5)
├── data/                       # SQLite (gitignored)
├── next.config.ts              # serverExternalPackages + allowedDevOrigins
└── .env.local                  # ANTHROPIC_API_KEY (gitignored)
```

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
