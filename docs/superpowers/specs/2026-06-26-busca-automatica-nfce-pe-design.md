# Busca automática de NFC-e — suporte a PE — Design

**Data:** 2026-06-26
**Branch alvo:** feature/busca-nfce-pe (a partir da `main`; busca SP já mergeada via PR #18)
**Status:** aprovado para implementação

## Problema

A busca automática de NFC-e já funciona em produção para **SP** (PR #18). O endpoint `/api/buscar-nota` hoje rejeita qualquer UF ≠ `35` com `unsupported_uf`. Queremos liberar o mesmo fluxo para **Pernambuco (UF 26)**.

O parser (`parseNfceHtml`) **já lê o formato de PE** — o fixture de teste atual (`lib/__tests__/fixtures/nfce-sp.html`) é, na prática, uma NFC-e de PE. O trabalho concentra-se em **reconhecer a UF/host de PE** e **liberar o gate de UF**.

## Objetivo

Quando o cliente escanear o QR (ou colar a URL completa do QR) de uma NFC-e de **PE**, o backend busca o HTML no portal da SEFAZ-PE, reaproveita o parser existente e salva a nota — igual ao SP. Qualquer falha continua degradando para o fluxo manual (upload de arquivo).

### Decisão-chave: PE só via QR/URL

Pelo padrão nacional do QR Code da NFC-e, o portal de PE valida a nota pelo **hash de assinatura** (`cHashQRCode`) que vem dentro do QR — não derivável a partir da chave crua. Portanto:

- **QR escaneado / URL completa colada** (com o `p=chave|...|hash`) → busca automática funciona.
- **Chave de 44 dígitos digitada** → **não** dá pra montar uma URL buscável; o usuário é orientado a escanear o QR (ou enviar o arquivo). (Para SP isso funciona porque o endpoint `…/qrcode?p=<chave>` aceita só a chave; PE não.)

### Não-objetivos

- Generalizar além de SP+PE. Estrutura-se de forma limpa (registro por UF), mas **sem** máquina especulativa (ex.: cálculo de hash por CSC, outras UFs). Cada UF nova entra depois como uma entrada no registro.
- Consulta manual por chave em PE (com captcha). Fora de escopo — chave PE digitada cai no fallback de arquivo.

## Componentes

### 1. Registro de portais — `lib/portais`

Um mapa por código de UF (IBGE), centralizando o **único** pedaço específico de cada estado:

```ts
type PortalUF = {
  uf: string;                                  // "35", "26"
  hosts: string[];                             // allowlist de hostname (sem porta)
  urlFromChave: (chave: string) => string | null; // monta URL canônica da chave crua, ou null
};

const PORTAIS: Record<string, PortalUF> = {
  "35": { uf: "35", hosts: ["www.nfce.fazenda.sp.gov.br", "nfce.fazenda.sp.gov.br"],
          urlFromChave: (c) => `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${c}` },
  "26": { uf: "26", hosts: ["nfce.sefaz.pe.gov.br"],
          urlFromChave: () => null },          // PE: só via QR/URL
};
```

Notas:
- `u.hostname` já remove a porta, então o host `nfce.sefaz.pe.gov.br` casa com a URL de PE que vem com `:444`.
- O `urlFromChave` de PE retorna `null` de propósito (decisão acima).

### 2. `lib/portais/sp.ts` → `extrairChave` UF-agnóstico

`extrairChave(input)` deixa de ser SP-específico:

- **Entrada URL:** mantém `url` **apenas se o `hostname` estiver na allowlist** de algum portal do registro (proteção contra SSRF — `buscarHtml` faz fetch server-side; nunca buscamos host arbitrário). Extrai a chave de `p=` (primeira seção antes do `|`).
- **Entrada chave crua:** UF = 2 primeiros dígitos; `url = PORTAIS[uf]?.urlFromChave(chave) ?? null`.
- Validação de dígito verificador (mod-11) permanece, agnóstica de UF.
- Retorno passa a incluir se a UF é suportada:

```ts
type ChaveResolvida = { chave: string; uf: string; url: string | null; ufSuportada: boolean };
// ufSuportada = uf in PORTAIS
```

`SP_NFCE_HOSTS` é absorvido pelo registro. `buscarHtml` e `detectarCaptcha` **não mudam** (já são genéricos; `buscarHtml` lida com a porta `:444` do PE).

> Observação de organização: o registro e `extrairChave`/`buscarHtml` podem viver num módulo UF-agnóstico (ex.: manter em `lib/portais/sp.ts` renomeando o conceito, ou mover para `lib/portais/index.ts`). O plano de implementação decide o arranjo de arquivos; o importante é não espalhar `if (uf === "35")`.

### 3. `app/api/buscar-nota/route.ts` — gate de UF em 3 casos

Substitui `if (resolved.uf !== "35" || !resolved.url)` por:

1. **UF fora do registro** (`!resolved.ufSuportada`) → `{ status: "unsupported_uf", uf, message }` com mensagem atualizada: *"Por enquanto a busca automática cobre **São Paulo e Pernambuco**. Use o envio de arquivo."*
2. **UF suportada, sem URL** (`ufSuportada && !url` — ex.: chave PE digitada) → `200 { status: "invalid", message }`: *"Para Pernambuco, **escaneie o QR Code** da nota — a chave digitada não dá pra buscar automaticamente. Ou envie o arquivo."* (Reusa o status `invalid`; a UI já renderiza `message` no ramo genérico de não-`ok`, sem mudança de tipo.)
3. **UF suportada, com URL** → fluxo atual inalterado: dedup → `buscarHtml` → `parseNfceHtml` (fallback Claude) → `upsertNota`.

### 4. Front-end (cópia)

- `QrScanButton.tsx`: a regex `NFCE_URL_RE` já casa `sefaz.pe.gov.br` — **sem mudança funcional**.
- `UploadDropzone.tsx`: ajustar a cópia que cita só SP (texto de ajuda e `placeholder` do campo) para mencionar SP **e PE**.

## Fluxo de dados

```
QR scan / colar (URL ou 44 dígitos)
   → extrairChave (host na allowlist? extrai p=; valida mod-11; deriva UF; url via registro)
   → !ufSuportada?        → unsupported_uf (fallback manual)
   → ufSuportada && !url?  → invalid "escaneie o QR" (ex.: chave PE digitada)
   → dedup por chave_acesso → existe? devolve a nota
   → buscarHtml (fetch server-side, UA browser, timeout 10s; trata :444 do PE)
       → captcha? → status captcha (fallback manual, sem retry)
       → erro?    → recordNotaErro + fallback manual
   → parseNfceHtml(html)  [já lê PE]
       → falhou? → parseNfceTextViaClaude(html) (fallback IA)
   → upsertNota (+ upsertEstabelecimento) → status ok
```

## Tratamento de erro (resumo)

| Situação | Resposta | Ação do front |
| --- | --- | --- |
| Chave inválida / não reconhecida | `invalid` | mensagem |
| Chave **PE digitada** (UF ok, sem URL) | `invalid` | "escaneie o QR" + upload |
| UF fora de SP/PE | `unsupported_uf` | oferece upload |
| Captcha detectado | `captcha` | abrir página + upload (sem retry) |
| Erro de rede/timeout | `error` (+ `recordNotaErro`) | oferece upload |
| Parse + IA falharam | `error` (+ `recordNotaErro`) | oferece upload |
| Nota já existe | `ok`/`exists` | mostra a nota |
| Sucesso | `ok` | mostra a nota salva |

## Anti-abuso / SSRF

- Endpoint exige autenticação (inalterado).
- `buscarHtml` só recebe URL de **host na allowlist** do registro (SP/PE) — não vira proxy aberto. Chave crua só vira URL via `urlFromChave` do registro.
- Dedup, sem retry em captcha, busca só sob ação explícita — inalterados.

## Testes

- **Unit `extrairChave`:**
  - URL de PE (`https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?p=26…|…|hash`) → `{ uf:"26", url:<a URL>, ufSuportada:true }`.
  - Chave PE crua válida `26260608868231000808650050000140891050162667` (uf 26, mod-11 ok) → `{ uf:"26", url:null, ufSuportada:true }`.
  - Chave de UF fora do registro (ex.: uf `33`/RJ, mod-11 ok) → `{ ufSuportada:false }`.
  - URL de host fora da allowlist → `url:null` (não busca host arbitrário).
  - Casos SP atuais seguem passando.
- **Unit `parseNfceHtml`:** já coberto pelo fixture PE existente.
- **Integração `route` (fetch mockado, sem chamada real à SEFAZ):**
  - URL PE + HTML válido → `upsertNota`, `status: ok`.
  - Chave PE digitada → `status: invalid` (mensagem "escaneie o QR"), nenhum fetch.
  - UF fora de SP/PE → `unsupported_uf`, nenhum fetch.

## Risco a validar (empírico)

Assume-se que a URL **assinada do QR de PE** é buscável server-side **sem captcha**, como ocorre no SP. Isso só se confirma com uma **NFC-e PE real escaneada** (a chave digitada que temos, `2626…2667`, exercita só o caminho "escaneie o QR", não o fetch real). Se PE exigir captcha no QR, o fluxo degrada graciosamente para o upload — mas a busca automática não entregaria para PE. Validar com um cupom PE real, como foi feito para o SP.
