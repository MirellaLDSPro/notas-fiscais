# Requisitos — Painel NFC-e

## 1. Visão geral

Aplicação web pessoal para **consolidar gastos** a partir de cupons fiscais
eletrônicos (NFC-e), planilhas próprias e o portal da Nota Fiscal Paulista (NFP).
Fornece um painel com indicadores, listas de compras recorrentes e geração de
receitas com IA a partir dos produtos comprados.

- **Público-alvo:** qualquer pessoa interessada em acompanhar seus gastos a
  partir de cupons fiscais. Cadastro aberto via Google OAuth; cada conta tem
  seu próprio workspace isolado.
- **Domínio:** consumo doméstico no Brasil — supermercados, NFC-e/NFP, dados em
  PT-BR e BRL.
- **Não é:** ERP, ferramenta fiscal/contábil.

## 2. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF01 | O sistema deve aceitar upload de **PDF de NFC-e**, **XLSX** consolidado e **CSV NFP** (UTF-16) e gravar cada nota com seus itens. |
| RF02 | Deve detectar e ignorar uploads duplicados pela `chave_acesso` (44 dígitos) ou pelo par `(cnpj, numero)`. |
| RF03 | Deve permitir leitura de **QR Code** do cupom via câmera para abrir o portal oficial da Fazenda na URL contida no QR. |
| RF04 | Deve exibir, na home `/`, KPIs de gasto total, gasto por compra e por mês, e gráfico mensal clicável que abre o detalhe de notas do mês. |
| RF05 | Deve exibir uma tabela de **top produtos** com quantidade, gasto acumulado e evolução de preço unitário. |
| RF06 | Deve calcular e exibir uma **lista de compras** em `/lista-compras` com produtos agrupados por categoria, considerando apenas categorias presentes em **2 ou mais notas distintas**. |
| RF07 | A lista de compras deve funcionar como **checklist interativo**, com persistência local do estado marcado por aparelho (sobrevive a refresh durante a compra). |
| RF08 | A lista de compras deve recalcular automaticamente a cada visita após um novo upload — sem cache persistente. |
| RF09 | Em `/receitas`, o sistema deve gerar de 3 a 5 receitas brasileiras a partir dos produtos das **3 notas com itens mais recentes**, usando a Claude API (`claude-haiku-4-5`). Acesso gateado pela feature flag `receitas` (RF21). |
| RF10 | O sistema deve consultar a **BrasilAPI** para enriquecer endereços de estabelecimentos a partir do CNPJ e gravar em tabela própria. |
| RF11 | O acesso às rotas de aplicação (exceto `/`, `/login` e `/api/auth/*`) deve exigir autenticação via **Google OAuth**. A landing `/` é pública. |
| RF12 | Qualquer conta Google deve poder logar e ter um **workspace isolado**: as notas (`notas`/`itens`) são escopadas por `user_id` e cada usuário só vê os próprios dados. |
| RF13 | No primeiro login de uma conta nova, o sistema deve criar registro em `users` automaticamente (upsert por email no callback `signIn` do NextAuth). |
| RF14 | O usuário autenticado deve ver seu email no menu lateral e dispor de botão **Sair**, que redireciona para a landing pública `/`. |
| RF15 | Em `/compartilhar`, o usuário deve poder conceder acesso de **leitura** ao seu relatório a outro email — incluindo emails de contas que ainda não logaram. A grant é per-email, idempotente (`UNIQUE (owner_user_id, shared_with_email)`) e removível. |
| RF16 | O recebedor de uma grant deve ver os relatórios disponíveis num combobox com busca no fim do menu. Selecionar abre `/dashboard`, `/precos` ou `/lista-compras` com `?owner=<id>`. |
| RF17 | Em modo de visualização compartilhada (`?owner=<id>`), o servidor deve verificar a grant via `canViewAsOwner(viewerEmail, ownerId)` antes de servir os dados do dono; falha redireciona para a rota base. Mutations (upload) ficam bloqueadas no client (escondidas) e devem ser bloqueadas no server caso a rota receba dados de escrita. |
| RF18 | A página `/receitas` não participa do compartilhamento — fica oculta do menu em modo viewing. |
| RF19 | Quando o parser regex de NFC-e em PDF falhar, o sistema deve tentar um **fallback automático via Claude Haiku 4.5** (parse completo: emitente, CNPJ, data, valor, itens, chave). Sucesso = nota entra na base com `fonte='CLAUDE'`. Falha = registra em `notas_erros` com os dados parciais extraídos pela IA. |
| RF20 | O painel `/admin/erros` deve listar, para administradores, (a) notas parseadas por IA — para revisão de dígitos — e (b) falhas totais com dados parciais. Erros são deduplicados por usuário (chave de acesso, senão SHA-256 do arquivo). |
| RF21 | O sistema deve expor um **sistema de feature flags** (`lib/featureFlags.ts`) com gates por usuário. Regra atual: `receitas` é true para admins (via `AUTH_ALLOWED_EMAILS`) OU para usuários com `users.flags.receitas = true` no banco. Aplicada em 3 camadas (menu, página, API). Mudanças no flag por usuário não exigem redeploy nem alteração de env var. |
| RF22 | O administrador deve poder habilitar/desabilitar feature flags por usuário direto em `/admin`, com 1 clique. Toggle persiste em `users.flags` JSONB e revalida o menu do alvo imediatamente. |
| RF23 | Quando `REDIS_URL` estiver configurada, o cache de receitas deve persistir no Redis (TTL 30 dias) para sobreviver a cold starts de serverless. Falhas do Redis caem transparentemente para o cache em memória (Map) sem propagar erro ao usuário. |

## 3. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF01 | **Disponibilidade:** deploy serverless (Vercel) — alvo de cold start < 2 s para rotas dinâmicas. |
| RNF02 | **Persistência:** banco gerenciado (Postgres no Neon) com schema criado lazy idempotente no primeiro acesso. |
| RNF03 | **Segurança — auth:** tokens de sessão JWT, secret estável (`AUTH_SECRET`) com o mesmo valor entre Production/Preview/Development (necessário para o cookie PKCE sobreviver ao round-trip do OAuth). Cookies HttpOnly. Cadastro aberto via Google — sem allowlist. |
| RNF04 | **Segurança — segredos:** nenhum segredo no repositório; tudo via env vars (`.env.local` em dev, dashboard do Vercel em prod). |
| RNF05 | **Privacidade:** dados pessoais (CPF, endereços, histórico de compras) ficam em DB privado; o repositório é público apenas com código, sem dados. |
| RNF06 | **Usabilidade móvel:** layout responsivo otimizado para o celular (uso típico é durante e após compras). |
| RNF07 | **Custo:** operar dentro do free tier de Neon, Vercel e Anthropic API; consumo de Claude alvo < R$ 1 / mês com uso pessoal. |
| RNF08 | **Observabilidade:** logs runtime no Vercel; erros não devem vazar credenciais nas mensagens. |
| RNF09 | **Resiliência:** falha da Anthropic API ou BrasilAPI **não** deve quebrar o dashboard — feature isolada degrada graciosamente. |
| RNF10 | **Idempotência:** uploads repetidos, sync de estabelecimentos e migração de schema não devem produzir efeitos colaterais. |

## 4. Requisitos técnicos

### Stack
- **Frontend/Server:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript.
- **Banco de dados:** PostgreSQL (Neon), acesso via `@neondatabase/serverless` (HTTP).
- **Autenticação:** NextAuth.js v5 (Auth.js) com provedor Google.
- **IA:** Anthropic SDK (`@anthropic-ai/sdk`), modelo `claude-haiku-4-5`.
- **Parsers:** `pdf-parse` (NFC-e), `xlsx` (planilhas), parser CSV próprio (NFP).
- **Gráficos:** `recharts`.
- **QR Code:** `qr-scanner` (browser camera API).

### Hosting
- **App:** Vercel (deploy automático no push para `main`).
- **DB:** Neon (us-east-1).
- **Auth:** Google Cloud OAuth client (External, Testing mode com test users).

### Integrações externas
| Serviço | Uso | Falha → comportamento |
| --- | --- | --- |
| **brasilapi.com.br** | enriquecer endereços por CNPJ | item sem endereço, sync log marca erro |
| **api.anthropic.com** | gerar receitas, categorizar produtos e parsear NFC-e que o regex não consegue ler | `/receitas` retorna placeholder; lista de compras usa fallback (dicionário + 1ª palavra); PDFs ilegíveis viram registro em `/admin/erros` em vez de inserir nota |
| **Redis Cloud** (via Vercel Marketplace) | cache persistente de receitas (TTL 30 dias) | fallback automático pra Map em memória sem perda de funcionalidade — só perde a persistência entre cold starts |
| **accounts.google.com** | OAuth de login | usuário não consegue logar — único caminho de auth no momento |

### Variáveis de ambiente obrigatórias
- `DATABASE_URL` — Postgres do Neon (`sslmode=require`).
- `AUTH_SECRET` — 32 bytes base64 (`openssl rand -base64 32`). Em prod, **mesmo valor** nos 3 ambientes do Vercel (Production/Preview/Development).
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — OAuth client do Google. Cada domínio que serve o app precisa estar nas Authorized redirect URIs do Google.

### Variáveis opcionais
- `ANTHROPIC_API_KEY` — habilita `/receitas`, categorização IA da lista de compras e o **fallback de parse de NFC-e em PDF** (`lib/ocrNfce.ts → parseNfceViaClaude`). Sem a chave, PDFs que o regex não decifra viram registro silencioso em `notas_erros`.
- `REDIS_URL` — habilita cache persistente das receitas (Redis Cloud via Vercel Marketplace). Sem ela, cache em memória (Map em `globalThis`). Format: `redis://default:SENHA@HOST:PORTA`.
- `AUTH_ALLOWED_EMAILS` — lista de emails (separados por vírgula) com acesso ao painel `/admin`. Não restringe login: cadastro segue aberto, apenas o link "Admin" no menu e a rota `/admin` ficam gated. Sem a variável, ninguém é admin.

### Variáveis que **não** devem ser setadas
- `AUTH_URL` / `NEXTAUTH_URL` — sem elas, Auth.js v5 detecta a origem via `x-forwarded-host` e cada domínio (custom + previews `.vercel.app`) funciona com seu próprio callback. Setar força um único callback e quebra o login nos outros domínios.

## 5. Modelo de dados

```
users (id, email UNIQUE, name, created_at,
       flags JSONB DEFAULT '{}'::jsonb)   -- per-user feature overrides
notas (id, user_id FK → users, numero, serie, data_emissao, emitente, cnpj,
       valor_total, chave_acesso, creditos, situacao_credito,
       fonte ∈ {'PDF','XLSX','NFP','CLAUDE'}, created_at,
       UNIQUE (user_id, chave_acesso) WHERE chave_acesso IS NOT NULL,
       UNIQUE (user_id, cnpj, numero) WHERE cnpj IS NOT NULL)
itens (id, nota_id FK → notas, produto, codigo, qt, un, vu, vt)
estabelecimentos (cnpj PK, razao_social, nome_fantasia, endereço completo,
                  latitude, longitude, fonte, updated_at)
produto_categorias (produto PK, categoria, fonte, criado_em)
report_shares (id, owner_user_id FK → users, shared_with_email, created_at,
               UNIQUE (owner_user_id, shared_with_email))
notas_erros (id, user_id FK → users, nome_arquivo, erro,
             numero, chave_acesso, file_sha256, dedup_key,
             parsed_partial JSONB, created_at,
             UNIQUE (user_id, dedup_key))
```

- `notas` e `itens` são **per-user** (escopo via `user_id` em `notas`; `itens`
  vincula por JOIN).
- `estabelecimentos` e `produto_categorias` são **globais** por design — info
  de CNPJ e mapeamento produto→categoria não dependem do comprador, e
  compartilhar evita chamadas duplicadas a BrasilAPI e Anthropic.
- As constraints únicas de nota são **per-user partial indexes** (toleram nulo),
  permitindo que dois usuários tenham a mesma nota fiscal.
- `notas.cnpj` é gravado **formatado** (`93.209.765/0697-45`); em
  `estabelecimentos.cnpj` é **só dígitos**. Helper `cnpjDigits()` em `lib/db.ts`.
- `produto_categorias` é cache do classificador AI; o dicionário hardcoded em
  `lib/categorizar.ts` não usa a tabela.
- `report_shares` é chaveado por **email** (não `user_id`) pra permitir
  compartilhar com alguém que ainda não logou. A resolução pra `user_id` é
  feita no momento da query (`canViewAsOwner` faz `WHERE shared_with_email =
  lower(viewerEmail)`).
- `notas_erros` é **per-user** e armazena uploads que falharam o parse —
  tanto regex quanto fallback Claude. Dedup por `(user_id, dedup_key)`, onde
  `dedup_key = chave_acesso ?? file_sha256`. `parsed_partial` (JSONB) guarda
  qualquer dado que o Claude conseguiu extrair (emitente, CNPJ, valor, etc.)
  pra revisão administrativa em `/admin/erros`.
- `users.flags` (JSONB) guarda overrides per-user de feature flags (ex.:
  `{ "receitas": true }`). Lida em todo page load pelo `lib/featureFlags.ts`.
  Setada via UI em `/admin` (server action chama `setUserFlag` com merge
  atômico via `jsonb_build_object`). Admins (`AUTH_ALLOWED_EMAILS`) recebem
  todas as flags como `true` independente do banco.

## 6. Restrições / fora de escopo

- **Sem app mobile nativo.** PWA-friendly via browser; QR scanner usa
  `getUserMedia` (precisa HTTPS).
- **Sem moderação ou rate-limit no cadastro.** Qualquer Google account loga;
  workspace fica isolado, mas não há proteção contra criação massiva de
  contas. Se isso virar problema, adicionar rate-limit no upload é a primeira
  defesa razoável.
- **Painel administrativo restrito.** Existe `/admin` (KPIs globais, lista de
  usuários, reset/excluir) e `/admin/erros` (uploads que falharam o parse +
  notas parseadas por IA). Acesso só pra emails listados em
  `AUTH_ALLOWED_EMAILS`. Operações além do que está exposto pelo painel
  (consultas ad hoc, correções pontuais) continuam exigindo Neon SQL Editor.
- **Compartilhamento é binário e por workspace inteiro.** Quem recebe acesso
  vê Dashboard + Lista de compras + Preços do owner. Permissionamento
  granular (esconder categorias específicas, esconder valores absolutos, dar
  acesso só a uma das páginas) está fora do escopo atual — fica como
  próximo passo se virar necessidade.
- **Compartilhamento não inclui Receitas.** A página consome API paga e
  cacheia por owner — compartilhar implicaria cobrança cruzada e
  reprocessamentos desnecessários.
- **Sem edição manual de notas via UI.** Correções precisam ser feitas no DB
  (Neon SQL Editor) ou re-upload do PDF original.
- **Sem internacionalização.** PT-BR e BRL hardcoded.
- **Sem export.** Não exporta CSV/XLSX do consolidado (entrada-only).
- **Reconciliação de produto entre marcas é heurística**, não autoritativa —
  pode haver imperfeições no agrupamento (ex.: "TAPIOCA" sob categoria PÃO).

## 7. Glossário

- **NFC-e** — Nota Fiscal de Consumidor Eletrônica; documento fiscal emitido em
  varejo (supermercado, padaria) e disponibilizado em PDF + QR Code.
- **NFP / Nota Fiscal Paulista** — programa do estado de SP que dá créditos
  sobre compras. O portal exporta um CSV (UTF-16 LE) com cabeçalho de notas e
  créditos, **sem itens detalhados**.
- **Chave de acesso** — identificador único de 44 dígitos da NFC-e.
- **BrasilAPI** — serviço público que expõe consulta de CNPJ entre outros
  dados — usado para preencher endereço de estabelecimentos.
- **Gate de acesso** — modelo de autenticação em que a maior parte da app
  fica atrás de login. Aqui a landing `/` é pública (apresenta o produto) e o
  resto exige autenticação.
- **Workspace** — escopo de dados de um usuário. Cada conta Google gera um
  workspace isolado: notas e itens são filtrados por `user_id` em todas as
  queries.
- **Share / Grant** — registro em `report_shares` que dá a um email externo
  acesso de leitura ao workspace do owner. Não dá acesso de escrita.
- **Modo viewing (viewing-as)** — estado em que o viewer consulta dados de
  outro user via `?owner=<id>` na URL. Server valida a grant antes de
  responder. Mutations ficam bloqueadas; UI esconde botões de escrita e
  exibe banner identificando o dono.
