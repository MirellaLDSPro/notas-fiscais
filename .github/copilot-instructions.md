# Instruções do Copilot para este repositório

Objetivo
- Ajudar sessões do Copilot a entender comandos de build/execução, arquitetura e convenções específicas do repositório dashboard-app (Next.js + TypeScript).

Build / run / test / lint
- App principal: dashboard-app (Next.js). A partir da raiz do repositório:
  - Instalar dependências: cd dashboard-app && npm install
  - Desenvolvimento: npm run dev  (abre Next em http://localhost:3000)
  - Build (produção): npm run build
  - Iniciar produção localmente: npm run start
- Testes/lint: não há scripts de teste ou lint no package.json atual. Se testes forem adicionados, rode-os dentro de dashboard-app usando o CLI do test runner (ex.: npm test). Para executar um teste único, comandos comuns são:
  - Vitest: npx vitest caminho/para/arquivo.test.ts
  - Jest: npx jest caminho/para/arquivo.test.ts
  Ajuste conforme o runner escolhido.

Visão geral da arquitetura (alto nível)
- Frontend: Next.js 16 (App Router, Turbopack) + TypeScript. Código em dashboard-app/ (app, pages, lib, components).
- Persistência: Postgres (Neon) via @neondatabase/serverless. O schema é inicializado de forma lazy no primeiro acesso.
- Fontes de dados: PDF (NFC-e), MHT/MHTML, XLSX, CSV (NFP). Parsers em dashboard-app/lib (ex.: parseNfpCsv.ts, ocrNfce.ts).
- Pipeline de parsing: parsers regex locais são executados primeiro; se o PDF não tiver texto ou o regex falhar, há um fallback via IA (Claude) em lib/ocrNfce.ts → parseNfceViaClaude.
- Serviços externos: Anthropic (Claude) para fallback OCR, categorização de produtos e geração de receitas; brasilapi para enriquecer CNPJ; Redis (opcional) para cache persistente.
- Feature flags: flags por usuário armazenadas em users.flags (JSONB). Resolução em lib/featureFlags.ts; a rota /receitas é protegida por flag.
- Cache: quando REDIS_URL estiver setada, receitas são cacheadas no Redis (TTL 30 dias). Caso contrário, cache em memória (Map).
- Rotas principais de API: /api/upload (multipart), /api/notas, /api/recipes (?force=1 para ignorar cache), /api/estabelecimentos/sync.
- Tabelas principais: users, notas, itens, estabelecimentos (global), produto_categorias (cache IA global), report_shares, notas_erros.

Convenções importantes do repositório
- Tratamento de CNPJ: em `notas` o CNPJ é salvo formatado (ex.: 93.209.765/0697-45); em `estabelecimentos` só dígitos. Use lib/db.ts:c nnpjDigits() para comparações.
- Valores de `fonte`: origem do parser é gravada como fonte ∈ {'PDF','XLSX','NFP','CLAUDE'}. Preserve essas strings ao inserir/atualizar.
- Deduplicação: notas são deduplicadas por chave_acesso quando presente; caso contrário por (cnpj, numero). Erros de parse são deduplicados por SHA-256 do arquivo ou pela chave_acesso extraída; ver lib/db.ts (upsertNota, recordNotaErro).
- Nuances de auth / variáveis de ambiente:
  - AUTH_SECRET deve ser o mesmo entre Production/Preview/Development para evitar quebra do cookie OAuth.
  - NÃO configure AUTH_URL em produção (Auth.js v5 detecta a origem via x-forwarded-host; setar AUTH_URL força um único callback e quebra logins em múltiplos domínios).
  - OAuth Google: adicione as URIs de callback por domínio no Google Cloud Console.
- Acesso de dispositivo em dev: next.config.ts expõe allowedDevOrigins para permitir scanner de QR no celular — atualize se seu IP LAN for diferente.
- Armazenamento de feature flags: users.flags (JSONB) armazena overrides por usuário, ex.: {"receitas": true}.
- Compartilhamento / visualização como outro usuário: páginas aceitam ?owner=<id> e validam via canViewAsOwner(email, ownerId). Em modo de visualização, ações de escrita ficam ocultas.

Onde olhar primeiro (arquivos-chave)
- dashboard-app/lib/db.ts — helpers do DB, dedupe, cnpjDigits, upsertNota, recordNotaErro
- dashboard-app/lib/ocrNfce.ts — lógica de fallback via Claude
- dashboard-app/lib/featureFlags.ts — resolução de flags
- dashboard-app/lib/parseNfpCsv.ts — parser de CSV NFP
- dashboard-app/package.json — scripts npm
- dashboard-app/README.md — detalhes de domínio, formatos de dados e notas operacionais

Regras de agentes / IA no repositório
- Veja dashboard-app/AGENTS.md:
  "This is NOT the Next.js you know — leia node_modules/next/dist/docs/ antes de escrever código. Observe avisos deprecatórios."
- dashboard-app/CLAUDE.md referencia AGENTS.md. Aplique essas regras a qualquer código gerado para dashboard-app.

Notas práticas para sessões do Copilot
- Respeitar o aviso sobre a variante do Next.js antes de alterar convenções de rotas ou APIs.
- Evitar alterar AUTH_URL ou o manuseio de AUTH_SECRET sem seguir o README.
- Ao modificar parsers, preservar a lógica de deduplicação e registro de erros.

MCP servers
- Este é um app web; há um workflow CI adicionada: .github/workflows/playwright-e2e.yml que executa os testes Playwright em pushes e PRs para a branch main.
- Para execuções interativas/compartilhadas, considere também um servidor MCP Playwright. Quer que eu configure um MCP Playwright server depois?

Resumo
- Criei .github/copilot-instructions.md em português com comandos de build/execução, arquitetura e convenções do repositório e adicionei um workflow CI para testes E2E. Quer ajustar algo ou incluir cobertura para outras áreas?
