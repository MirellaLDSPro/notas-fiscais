# Requisitos — Painel NFC-e

## 1. Visão geral

Aplicação web pessoal para **consolidar gastos** a partir de cupons fiscais
eletrônicos (NFC-e), planilhas próprias e o portal da Nota Fiscal Paulista (NFP).
Fornece um painel com indicadores, listas de compras recorrentes e geração de
receitas com IA a partir dos produtos comprados.

- **Público-alvo:** uso pessoal/familiar; 1 a poucos usuários autorizados por
  email (sem cadastro público).
- **Domínio:** consumo doméstico no Brasil — supermercados, NFC-e/NFP, dados em
  PT-BR e BRL.
- **Não é:** ERP, ferramenta fiscal/contábil, sistema multi-tenant.

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
| RF09 | Em `/receitas`, o sistema deve gerar de 3 a 5 receitas brasileiras a partir dos produtos das **3 notas com itens mais recentes**, usando a Claude API (`claude-haiku-4-5`). |
| RF10 | O sistema deve consultar a **BrasilAPI** para enriquecer endereços de estabelecimentos a partir do CNPJ e gravar em tabela própria. |
| RF11 | O acesso a qualquer rota (exceto `/login` e `/api/auth/*`) deve exigir autenticação via **Google OAuth**, com email validado contra uma whitelist. |
| RF12 | O usuário autenticado deve ver seu email no menu lateral e dispor de botão **Sair**. |

## 3. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF01 | **Disponibilidade:** deploy serverless (Vercel) — alvo de cold start < 2 s para rotas dinâmicas. |
| RNF02 | **Persistência:** banco gerenciado (Postgres no Neon) com schema criado lazy idempotente no primeiro acesso. |
| RNF03 | **Segurança — auth:** tokens de sessão JWT, secret rotativo (`AUTH_SECRET`), cookies HttpOnly. Whitelist por email; sem self-signup. |
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
| **api.anthropic.com** | gerar receitas + categorizar produtos | `/receitas` retorna placeholder; lista de compras usa fallback (dicionário + 1ª palavra) |
| **accounts.google.com** | OAuth de login | usuário não consegue logar — único caminho de auth no momento |

### Variáveis de ambiente obrigatórias
- `DATABASE_URL` — Postgres do Neon (`sslmode=require`).
- `AUTH_SECRET` — 32 bytes base64 (`openssl rand -base64 32`).
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — OAuth client do Google.
- `AUTH_ALLOWED_EMAILS` — lista de emails autorizados, separados por vírgula.
- `AUTH_URL` (prod) — URL canônica do app no Vercel.

### Variáveis opcionais
- `ANTHROPIC_API_KEY` — habilita `/receitas` e categorização IA da lista de compras.

## 5. Modelo de dados

```
notas (id, numero, serie, data_emissao, emitente, cnpj, valor_total,
       chave_acesso UNIQUE, creditos, situacao_credito, fonte, created_at,
       UNIQUE (cnpj, numero))
itens (id, nota_id FK, produto, codigo, qt, un, vu, vt)
estabelecimentos (cnpj PK, razao_social, nome_fantasia, endereço completo,
                  latitude, longitude, fonte, updated_at)
produto_categorias (produto PK, categoria, fonte, criado_em)
```

- `notas.cnpj` é gravado **formatado** (`93.209.765/0697-45`); em
  `estabelecimentos.cnpj` é **só dígitos**. Helper `cnpjDigits()` em `lib/db.ts`.
- `produto_categorias` é cache do classificador AI; o dicionário hardcoded em
  `lib/categorizar.ts` não usa a tabela.

## 6. Restrições / fora de escopo

- **Sem cadastro público.** Whitelist de emails é a única forma de autorização.
- **Sem multi-tenancy.** Todos os usuários autorizados veem os mesmos dados.
- **Sem app mobile nativo.** PWA-friendly via browser; QR scanner usa
  `getUserMedia` (precisa HTTPS).
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
- **Gate de acesso** — modelo de autenticação em que a app inteira fica atrás
  de login, sem páginas públicas exceto o próprio login.
