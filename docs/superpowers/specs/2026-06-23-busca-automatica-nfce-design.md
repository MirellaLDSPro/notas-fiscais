# Busca automática de NFC-e (SP) — Design

**Data:** 2026-06-23
**Branch alvo:** feature/busca-automatica-nfce
**Status:** aprovado para implementação

## Problema

Hoje o cliente, para registrar uma NFC-e de São Paulo, precisa:
1. Escanear o QR Code (que apenas **abre** a página da Fazenda em nova aba — `QrScanButton`), ou consultar manualmente no portal;
2. Baixar/salvar o arquivo (PDF, MHT, XLSX, CSV);
3. Fazer upload em `/api/upload`.

Observou-se que o portal da SEFAZ-SP **não exibe captcha até certo volume de uso** (limite por IP de origem). Isso abre espaço para o sistema buscar a nota sozinho a partir do QR/chave, eliminando os passos de download e upload na maioria dos casos.

## Objetivo

Quando o cliente fornecer o QR (scan no celular) ou colar a URL/chave (desktop), o backend busca o HTML da NFC-e direto no portal da SEFAZ-SP, reaproveita o parser de HTML existente e salva a nota — **sem upload de arquivo**. Qualquer falha (captcha, portal fora do ar, layout mudou, chave inválida) **degrada para o fluxo manual atual**, de modo que o cliente nunca fica travado.

### Não-objetivos (v1)
- Outras UFs além de SP. A arquitetura prevê um diretório `lib/portais/` extensível (PE e outras entram depois), mas só SP é implementado agora.
- Busca assíncrona / fila. O v1 é síncrono. Fila fica como evolução caso o captcha se torne um problema recorrente.
- Busca no browser do cliente (preservaria o orçamento de captcha por-IP do usuário), descartada porque o **CORS** impede o browser de ler a resposta do portal da SEFAZ.

## Decisões de arquitetura

### Por que busca no servidor (e não no cliente)
A observação do captcha é **por IP**. Buscar no browser do cliente gastaria o orçamento por-IP de cada usuário (ideal), em vez de queimar os IPs compartilhados da Vercel. Mesmo assim, a busca é **server-side**, pela razão abaixo.

Convém separar **buscar** (rede) de **parsear** (string):
- **O parse é portável pro cliente.** `parseNfceHtml(html)` é regex puro sobre string (o `Buffer` está só no `extractHtmlPart`/`decodeQuotedPrintable`, específicos do MHT). Rodaria no browser sem problema — o parse nunca foi o gargalo.
- **A busca não é portável.** O browser até dispara o `fetch` para o portal, mas **bloqueia o JS de ler o corpo** porque a resposta não traz `Access-Control-Allow-Origin` para o nosso domínio. CORS é enforced pelo browser; não há como configurar do nosso lado. Os contornos também morrem: `mode: 'no-cors'` devolve resposta opaca (corpo inacessível); `<iframe>`/`window.open` esbarram na same-origin policy (não lemos o DOM cross-origin, e gov costuma mandar `X-Frame-Options`).

Como sem o HTML no cliente o parse client-side não tem o que parsear, e o **fallback de IA** (`parseNfceTextViaClaude`) precisaria continuar no servidor de qualquer modo (a API key não vai pro browser), não há ganho em separar: o fetch e o parse ficam ambos no servidor.

Os únicos caminhos que de fato leem a página com o IP do usuário são **extensão de browser** (content script com `host_permissions` fura o CORS) ou **app nativo/WebView** (HTTP nativo ignora CORS) — ambos saltos de escopo fora do v1. A única incógnita que reabriria o client-side seria a SEFAZ-SP passar a devolver `Access-Control-Allow-Origin` permissivo nessa página (raríssimo em portal gov; ~99% que não), o que é barato de checar olhando os headers da resposta.

Mitigações para o orçamento de captcha compartilhado dos IPs da Vercel:
- **Dedup por `chave_acesso`**: se o usuário já tem a nota, devolve sem buscar.
- **Sem retry** quando captcha é detectado (retry só queima orçamento).
- Busca apenas sob ação explícita do cliente (scan/colar), nunca em background.

### Reúso do parser
O parser HTML→`ParsedNota` hoje está embutido em `parseMhtNfceBuffer` (`lib/parseMhtNfce.ts`), que faz `extractHtmlPart(buf)` e então parseia. Como na busca já teremos o HTML cru do portal, extrai-se o miolo para uma função pública `parseNfceHtml(html)`, compartilhada pelos dois fluxos. **Sem mudança de comportamento** no upload de MHT.

## Componentes

### 1. `lib/parseMhtNfce.ts` — refactor `parseNfceHtml(html)`
- Nova função exportada `parseNfceHtml(html: string): ParsedNota` contendo toda a lógica de parse de HTML hoje dentro de `parseMhtNfceBuffer`.
- `parseMhtNfceBuffer(buf)` passa a ser `parseNfceHtml(extractHtmlPart(buf))`.
- Mantém os mesmos lances de `NotaParseError` / hints já existentes.

### 2. `lib/portais/sp.ts` — adapter SP
Diretório `lib/portais/` reservado para futuros adapters por UF.
- `extrairChave(input: string): string | null`
  - Aceita **URL completa do QR** (extrai o parâmetro `p=`, cuja primeira seção é a chave) **ou** 44 dígitos crus.
  - Valida: 44 dígitos; UF = `35` (2 primeiros dígitos) para SP; dígito verificador (mod-11). Retorna a chave normalizada (só dígitos) ou `null`.
- `ufDaChave(chave: string): string` — dígitos 0-1 → código IBGE da UF (`35` = SP).
- `buscarHtml(chave: string): Promise<FetchResult>`
  - Monta a URL de consulta da NFC-e SP a partir da chave.
  - `fetch` server-side com User-Agent de browser e timeout (~10s, via `AbortController`).
  - Retorna `{ ok: true, html }` | `{ ok: false, captcha: true }` | `{ ok: false, erro: string }`.
- `detectarCaptcha(html: string): boolean` — heurística: presença de marcadores de captcha **ou** ausência dos marcadores de NFC-e (`NOTA FISCAL DE CONSUMIDOR ELETRÔNICA` / `NFC-e`).
- Restringe o host de destino ao domínio do portal NFC-e SP (não vira proxy aberto).

### 3. `app/api/buscar-nota/route.ts` — endpoint POST (`runtime = "nodejs"`)
Espelha o padrão de `/api/upload`. Fluxo:
1. `auth()` → 401 se não autenticado.
2. Body `{ url?: string; chave?: string }` → `extrairChave`. Inválida → 400 com mensagem.
3. UF ≠ SP → resposta `{ status: "unsupported_uf" }` com mensagem "UF ainda não suportada, use o upload".
4. **Dedup**: se o usuário já tem `chave_acesso` → `{ status: "exists", nota }` sem buscar.
5. `buscarHtml(chave)`:
   - `captcha` → `{ status: "captcha" }` (front cai pro manual). Sem retry.
   - `erro` → `recordNotaErro` + `{ status: "error", message }`.
6. `ok` → `parseNfceHtml(html)`:
   - sucesso → `upsertNota` + (`upsertEstabelecimento` quando houver endereço/CNPJ) → `{ status: "ok", nota }`.
   - `parseNfceHtml` lança → tenta `parseNfceTextViaClaude(html)` (fallback IA existente). Sucesso → upsert + `{ status: "ok", fonte: "CLAUDE" }`. Falha → `recordNotaErro` + `{ status: "error" }`.

### 4. Front-end
- **`app/QrScanButton.tsx`**: ao detectar URL da Fazenda, em vez de `window.open`, faz `POST /api/buscar-nota`, mostra spinner e o resultado (busca e salva **direto**, sem confirmação). Em `status` de captcha/erro/unsupported_uf, oferece o caminho manual de hoje (abrir página + upload) como escape.
- **Campo colar/digitar** (desktop, perto do `UploadDropzone`): input para URL ou 44 dígitos → mesmo endpoint, mesmo tratamento de resposta.

## Fluxo de dados

```
QR scan / colar
   → extrairChave (URL p= ou 44 dígitos; valida UF=35 + mod-11)
   → UF != SP? → unsupported_uf (fallback manual)
   → dedup por chave_acesso → existe? devolve a nota
   → buscarHtml (fetch server-side, UA browser, timeout 10s)
       → captcha? → status captcha (fallback manual, sem retry)
       → erro?    → recordNotaErro + fallback manual
   → parseNfceHtml(html)
       → falhou? → parseNfceTextViaClaude(html) (fallback IA)
           → falhou? → recordNotaErro + fallback manual
   → upsertNota (+ upsertEstabelecimento) → status ok
```

## Tratamento de erro (resumo)
Todo caminho de falha termina no **fluxo manual de hoje**:
| Situação | Resposta | Ação do front |
| --- | --- | --- |
| Chave inválida | 400 | mensagem |
| UF ≠ SP | `unsupported_uf` | oferece upload |
| Captcha detectado | `captcha` | oferece abrir página + upload (sem retry) |
| Erro de rede/timeout | `error` (+ `recordNotaErro`) | oferece upload |
| Parse + IA falharam | `error` (+ `recordNotaErro`) | oferece upload |
| Nota já existe | `exists` | mostra a nota |
| Sucesso | `ok` | mostra a nota salva |

## Anti-abuso / boas práticas
- Endpoint exige autenticação (sessão existente).
- Aceita apenas host do portal NFC-e SP e chave válida (UF + dígito verificador) — não vira proxy aberto.
- Dedup evita re-busca → economiza orçamento de captcha e responde instantâneo.
- User-Agent de browser realista; timeout curto; sem retry em captcha.

## Testes
- **Unit**
  - `parseNfceHtml` sobre fixtures de HTML de NFC-e SP (extraído de um MHT real de exemplo) → `ParsedNota` correto.
  - `detectarCaptcha` em fixture de página com captcha (true) e em página de NFC-e válida (false).
  - `extrairChave`: URL com `p=`, 44 dígitos crus, chave com UF ≠ 35, chave com dígito verificador errado, lixo → resultados esperados.
- **Integração** (endpoint com `fetch` mockado, **sem chamadas reais à SEFAZ**)
  - HTML válido → `upsertNota` chamado, `status: ok`.
  - Página de captcha → `status: captcha`, nenhum upsert.
  - Erro de rede → `status: error`, `recordNotaErro` chamado.
  - Chave já existente do usuário → `status: exists`, nenhuma busca.

## Evolução futura (fora do v1)
- Adapters PE e outras UFs em `lib/portais/`, selecionados por `ufDaChave`.
- Busca assíncrona com fila + espaçamento de requests por IP, caso o captcha vire gargalo.
