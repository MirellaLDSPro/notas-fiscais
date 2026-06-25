# Busca automática de NFC-e (SP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A partir do QR (scan) ou de uma URL/chave colada, buscar o HTML da NFC-e direto no portal da SEFAZ-SP, parsear e salvar a nota — sem upload de arquivo — degradando para o fluxo manual em qualquer falha.

**Architecture:** Endpoint síncrono `POST /api/buscar-nota` que resolve a chave (`lib/portais/sp.ts`), checa dedup, busca o HTML server-side, reusa o parser `parseNfceHtml` (extraído de `parseMhtNfce.ts`) com fallback IA já existente, e faz upsert. Frontend dispara via `QrScanButton` (scan) e um campo de colar/digitar no `UploadDropzone`, reusando o painel de resultados atual.

**Tech Stack:** Next.js 16 (App Router, route handlers `runtime = "nodejs"`), TypeScript, Neon Postgres, `@anthropic-ai/sdk` (fallback IA já existente), Vitest (novo, para os testes).

## Global Constraints

- **Next 16 modificado:** este repo roda um Next.js com breaking changes. NÃO assuma APIs de memória — espelhe o route handler existente `app/api/upload/route.ts` como fonte de verdade. Se precisar desviar do padrão dele, leia antes o guia em `node_modules/next/dist/docs/`.
- **Route handlers:** assinatura `export async function POST(request: Request)`, com `export const runtime = "nodejs"` (preciso de `node:crypto` e `Buffer`).
- **Anti-SSRF:** só buscar hosts do portal NFC-e SP (`www.nfce.fazenda.sp.gov.br`, `nfce.fazenda.sp.gov.br`). Nunca buscar URL arbitrária do usuário.
- **Sem retry em captcha** (retry queima orçamento de IP por IP).
- **UI em português**, reusando o objeto de cores `C` do componente que está sendo editado.
- **Sem novas deps de runtime** além do que já existe; `vitest` entra só como `devDependency`.
- **`fonte` das notas buscadas:** `"BUSCA"` quando o parser regex acerta; `"CLAUDE"` quando cai no fallback IA.

---

### Task 1: Infra de testes (Vitest)

Não há runner de teste no projeto. Esta task instala e configura o Vitest e prova que roda.

**Files:**
- Modify: `package.json` (devDependency + scripts)
- Create: `vitest.config.ts`
- Create: `lib/__tests__/smoke.test.ts` (temporário, removido no fim da task)

**Interfaces:**
- Produces: comando `npx vitest run` funcional; alias `@/` resolvido nos testes; `npm test` roda a suíte.

- [ ] **Step 1: Instalar o Vitest**

```bash
npm install -D vitest@^2
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Adicionar scripts ao `package.json`**

No bloco `"scripts"`, adicionar:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Escrever o smoke test**

`lib/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("infra", () => {
  it("roda o vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib/__tests__/smoke.test.ts`
Expected: 1 passed.

- [ ] **Step 6: Remover o smoke test e commitar**

```bash
rm lib/__tests__/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "test: configura Vitest (runner + alias @/)"
```

---

### Task 2: Refatorar `parseNfceHtml(html)` em `parseMhtNfce.ts`

Extrai o miolo HTML→`ParsedNota` (hoje dentro de `parseMhtNfceBuffer`, linhas ~119-205) para uma função pública, sem mudar comportamento do upload de MHT. Vira a base testável do parser, compartilhada com a busca.

**Files:**
- Modify: `lib/parseMhtNfce.ts` (extrair função, reusar helpers module-level)
- Create: `lib/__tests__/parseNfceHtml.test.ts`
- Create: `lib/__tests__/fixtures/nfce-sp.html` (HTML real extraído de um MHT de exemplo)

**Interfaces:**
- Produces: `export function parseNfceHtml(html: string): ParsedNota` em `lib/parseMhtNfce.ts`. Lança `NotaParseError`/`Error` igual hoje. `fonte` retornado é `"PDF"` (inalterado para o caminho MHT).
- Consumes: helpers já existentes no arquivo (`findChaveAcessoHtml`, `clean`, `toNum`, `decodeEntities`, `ITEM_ROW_RE`, `ITEM_FIELD_RE`) e `parseEnderecoPdf`/`NotaParseError` de `./parseNfce`.

- [ ] **Step 1: Gerar a fixture de HTML a partir de um MHT real**

Roda um one-liner que usa o `extractHtmlPart` já existente para extrair o HTML de um MHT de exemplo e salvar como fixture:

```bash
mkdir -p lib/__tests__/fixtures
npx tsx -e "import {extractHtmlPart} from './lib/parseMhtNfce'; import {readFileSync,writeFileSync} from 'node:fs'; const b=readFileSync('Compras/2023/DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA.mht'); writeFileSync('lib/__tests__/fixtures/nfce-sp.html', extractHtmlPart(b));"
```

Se `tsx` não estiver disponível, instalar com `npm i -D tsx` (dev-only) e repetir. Confirmar que o arquivo tem conteúdo:

```bash
wc -c lib/__tests__/fixtures/nfce-sp.html
```
Expected: tamanho > 0 (alguns KB).

- [ ] **Step 2: Escrever o teste que ainda vai falhar (função não existe)**

`lib/__tests__/parseNfceHtml.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseNfceHtml } from "@/lib/parseMhtNfce";

const html = readFileSync(
  resolve(__dirname, "fixtures/nfce-sp.html"),
  "utf8"
);

describe("parseNfceHtml", () => {
  it("extrai os campos principais da NFC-e", () => {
    const nota = parseNfceHtml(html);
    expect(nota.emitente.length).toBeGreaterThan(0);
    expect(nota.data_emissao).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(nota.valor_total).toBeGreaterThan(0);
    expect(nota.itens.length).toBeGreaterThan(0);
    expect(nota.fonte).toBe("PDF");
  });

  it("lança em HTML que não é NFC-e", () => {
    expect(() => parseNfceHtml("<html><body>nada aqui</body></html>")).toThrow();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run lib/__tests__/parseNfceHtml.test.ts`
Expected: FAIL — `parseNfceHtml is not a function` / sem export.

- [ ] **Step 4: Extrair a função**

Em `lib/parseMhtNfce.ts`, transformar o corpo atual de `parseMhtNfceBuffer` (da checagem `if (!/NOTA FISCAL.../...)` até o `return {...}`) em uma nova função e fazer o buffer chamá-la:

```ts
export function parseNfceHtml(html: string): ParsedNota {
  if (!/NOTA FISCAL DE CONSUMIDOR ELETR[ÔO]NICA|NFC-?e/i.test(html)) {
    throw new Error("Conteúdo não parece ser de uma NFC-e.");
  }
  // ...todo o corpo que hoje está em parseMhtNfceBuffer após o extractHtmlPart...
  // (emitente, cnpj, endereco, chave, headerText/headerMatch, itens, valorTotal)
  return {
    numero,
    serie,
    data_emissao: dataEmissao,
    emitente,
    cnpj,
    chave_acesso: chave,
    valor_total: valorTotal,
    fonte: "PDF",
    itens,
    endereco,
  };
}

export function parseMhtNfceBuffer(buffer: Buffer): ParsedNota {
  return parseNfceHtml(extractHtmlPart(buffer));
}
```

(A mensagem de erro do guard muda de "MHT não parece..." para "Conteúdo não parece..." porque agora serve aos dois caminhos.)

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib/__tests__/parseNfceHtml.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Garantir que o upload de MHT não quebrou (typecheck)**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commitar**

```bash
git add lib/parseMhtNfce.ts lib/__tests__/parseNfceHtml.test.ts lib/__tests__/fixtures/nfce-sp.html package.json package-lock.json
git commit -m "refactor: extrai parseNfceHtml de parseMhtNfceBuffer + teste"
```

---

### Task 3: Adapter SP — `extrairChave` (resolução + validação)

Cria o diretório de adapters por UF e a resolução de chave a partir de URL ou 44 dígitos, com validação (44 dígitos, dígito verificador mod-11) e allowlist de host anti-SSRF.

**Files:**
- Create: `lib/portais/sp.ts`
- Create: `lib/portais/__tests__/sp.extrairChave.test.ts`

**Interfaces:**
- Produces:
  - `export type ChaveResolvida = { chave: string; uf: string; url: string | null }`
  - `export function extrairChave(input: string): ChaveResolvida | null`
  - `export const SP_NFCE_HOSTS: string[]`
- `url` é não-nulo só quando há URL segura de SP para buscar (host SP, ou chave SP montando a URL de QR). UF não-SP → `url: null`.

- [ ] **Step 1: Escrever os testes (falham — módulo não existe)**

`lib/portais/__tests__/sp.extrairChave.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extrairChave } from "@/lib/portais/sp";

// Chave SP (UF 35) válida com DV correto, montada para o teste.
// 43 dígitos base + DV calculado por mod-11.
function comDV(base43: string): string {
  let peso = 2, soma = 0;
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += Number(base43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
  return base43 + String(dv);
}
const CHAVE_SP = comDV("35" + "2106".padEnd(41, "7").slice(0, 41)); // 43 dígitos, começa com 35
const CHAVE_PE = comDV("26" + "2106".padEnd(41, "7").slice(0, 41)); // UF 26 = PE

describe("extrairChave", () => {
  it("aceita 44 dígitos crus de SP", () => {
    const r = extrairChave(CHAVE_SP);
    expect(r?.chave).toBe(CHAVE_SP);
    expect(r?.uf).toBe("35");
    expect(r?.url).toContain("nfce.fazenda.sp.gov.br");
  });

  it("aceita URL de QR do portal SP e extrai a chave do param p", () => {
    const url = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE_SP}|2|1|1|ABC`;
    const r = extrairChave(url);
    expect(r?.chave).toBe(CHAVE_SP);
    expect(r?.url).toBe(url);
  });

  it("chave de outra UF resolve mas sem url (não-SP)", () => {
    const r = extrairChave(CHAVE_PE);
    expect(r?.uf).toBe("26");
    expect(r?.url).toBeNull();
  });

  it("rejeita chave com dígito verificador errado", () => {
    const ruim = CHAVE_SP.slice(0, 43) + String((Number(CHAVE_SP[43]) + 1) % 10);
    expect(extrairChave(ruim)).toBeNull();
  });

  it("rejeita lixo", () => {
    expect(extrairChave("não é nota")).toBeNull();
    expect(extrairChave("")).toBeNull();
  });

  it("URL de host não-SP não vira url buscável", () => {
    const r = extrairChave(`https://evil.example.com/x?p=${CHAVE_SP}`);
    // chave válida é extraída, mas url fica null (host fora da allowlist)
    expect(r?.url).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/portais/__tests__/sp.extrairChave.test.ts`
Expected: FAIL — não resolve `@/lib/portais/sp`.

- [ ] **Step 3: Implementar `extrairChave`**

`lib/portais/sp.ts`:

```ts
export const SP_NFCE_HOSTS = ["www.nfce.fazenda.sp.gov.br", "nfce.fazenda.sp.gov.br"];

export type ChaveResolvida = { chave: string; uf: string; url: string | null };

function digitoVerificadorOk(chave: string): boolean {
  if (chave.length !== 44 || !/^\d{44}$/.test(chave)) return false;
  const base = chave.slice(0, 43);
  const dv = Number(chave[43]);
  let peso = 2, soma = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const calc = resto === 0 || resto === 1 ? 0 : 11 - resto;
  return calc === dv;
}

export function extrairChave(input: string): ChaveResolvida | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  let chave = "";
  let urlSp: string | null = null;

  if (/^https?:\/\//i.test(trimmed)) {
    let u: URL;
    try { u = new URL(trimmed); } catch { return null; }
    const isSp = SP_NFCE_HOSTS.includes(u.hostname.toLowerCase());
    const p = u.searchParams.get("p") ?? "";
    chave =
      p.split("|")[0].replace(/\D/g, "").match(/\d{44}/)?.[0] ??
      trimmed.replace(/\D/g, "").match(/\d{44}/)?.[0] ??
      "";
    if (isSp) urlSp = trimmed;
  } else {
    chave = trimmed.replace(/\D/g, "").match(/\d{44}/)?.[0] ?? "";
  }

  if (!digitoVerificadorOk(chave)) return null;
  const uf = chave.slice(0, 2);
  const url = urlSp ?? (uf === "35" ? `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${chave}` : null);
  return { chave, uf, url };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/portais/__tests__/sp.extrairChave.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commitar**

```bash
git add lib/portais/sp.ts lib/portais/__tests__/sp.extrairChave.test.ts
git commit -m "feat(portais): extrairChave SP (URL/chave, mod-11, allowlist)"
```

---

### Task 4: Adapter SP — `buscarHtml` + `detectarCaptcha`

Busca o HTML server-side (UA de browser, timeout, decode de charset) e detecta captcha/página inesperada.

**Files:**
- Modify: `lib/portais/sp.ts`
- Create: `lib/portais/__tests__/sp.buscarHtml.test.ts`

**Interfaces:**
- Produces:
  - `export type FetchResult = { ok: true; html: string } | { ok: false; captcha?: true; erro?: string }`
  - `export async function buscarHtml(url: string): Promise<FetchResult>`
  - `export function detectarCaptcha(html: string): boolean`
- Consumes: `fetch` global (Node 18+/Next runtime).

> **Nota de verificação:** a URL exata (`/qrcode?p=`) e o charset (ISO-8859-1 vs UTF-8) das respostas do portal SP são confirmados na Task 8 com uma nota real. O código abaixo usa o melhor palpite (decode por `content-type` com fallback latin1); a Task 8 ajusta em uma linha se necessário.

- [ ] **Step 1: Escrever os testes (mock do fetch global)**

`lib/portais/__tests__/sp.buscarHtml.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { buscarHtml, detectarCaptcha } from "@/lib/portais/sp";

const NFCE_OK = "<html><body>NOTA FISCAL DE CONSUMIDOR ELETRÔNICA ... itens ...</body></html>";
const CAPTCHA = "<html><body><div class='g-recaptcha'></div>Digite o captcha</body></html>";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(body: string, init?: { ok?: boolean; status?: number; contentType?: string }) {
  const buf = Buffer.from(body, "latin1");
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    headers: new Map([["content-type", init?.contentType ?? "text/html; charset=ISO-8859-1"]]) as any,
    arrayBuffer: async () => buf,
  })));
}

describe("detectarCaptcha", () => {
  it("true quando há marcador de captcha", () => expect(detectarCaptcha(CAPTCHA)).toBe(true));
  it("true quando não há marcador de NFC-e (página inesperada)", () =>
    expect(detectarCaptcha("<html>erro</html>")).toBe(true));
  it("false numa NFC-e válida", () => expect(detectarCaptcha(NFCE_OK)).toBe(false));
});

describe("buscarHtml", () => {
  it("retorna ok+html numa resposta de NFC-e", async () => {
    stubFetch(NFCE_OK);
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r).toEqual({ ok: true, html: expect.stringContaining("CONSUMIDOR") });
  });

  it("retorna captcha quando a página pede captcha", async () => {
    stubFetch(CAPTCHA);
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r).toEqual({ ok: false, captcha: true });
  });

  it("retorna erro em status HTTP ruim", async () => {
    stubFetch("", { ok: false, status: 503 });
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("503");
  });

  it("retorna erro quando o fetch lança", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/portais/__tests__/sp.buscarHtml.test.ts`
Expected: FAIL — `buscarHtml`/`detectarCaptcha` não existem.

- [ ] **Step 3: Implementar (append em `lib/portais/sp.ts`)**

```ts
export type FetchResult =
  | { ok: true; html: string }
  | { ok: false; captcha?: true; erro?: string };

const NFCE_MARKER = /NOTA FISCAL DE CONSUMIDOR ELETR[ÔO]NICA|NFC-?e/i;
const CAPTCHA_MARKER = /captcha|recaptcha|g-recaptcha|hcaptcha|imagem de verifica/i;

export function detectarCaptcha(html: string): boolean {
  if (CAPTCHA_MARKER.test(html)) return true;
  if (!NFCE_MARKER.test(html)) return true; // página inesperada → trata como bloqueio
  return false;
}

function decodeHtml(buf: Buffer, contentType: string): string {
  const charset = contentType.match(/charset=([\w-]+)/i)?.[1]?.toLowerCase() ?? "";
  if (charset.includes("8859") || charset.includes("1252") || charset.includes("latin")) {
    return new TextDecoder("latin1").decode(buf);
  }
  if (!charset) {
    const head = buf.subarray(0, 1024).toString("latin1");
    if (/charset=["']?(iso-8859-1|windows-1252)/i.test(head)) {
      return new TextDecoder("latin1").decode(buf);
    }
  }
  return new TextDecoder("utf-8").decode(buf);
}

export async function buscarHtml(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!res.ok) return { ok: false, erro: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    const html = decodeHtml(buf, res.headers.get("content-type") ?? "");
    if (detectarCaptcha(html)) return { ok: false, captcha: true };
    return { ok: true, html };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Falha na busca" };
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/portais/__tests__/sp.buscarHtml.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commitar**

```bash
git add lib/portais/sp.ts lib/portais/__tests__/sp.buscarHtml.test.ts
git commit -m "feat(portais): buscarHtml + detectarCaptcha SP"
```

---

### Task 5: `notaExistsByChave` + `fonte` "BUSCA" no `lib/db.ts`

Helper de dedup pré-busca e ampliação do tipo `Fonte`.

**Files:**
- Modify: `lib/db.ts`
- Create: `lib/__tests__/db.fonte.test.ts` (type-level: garante que "BUSCA" é Fonte)

**Interfaces:**
- Produces:
  - `export type Fonte = "PDF" | "XLSX" | "NFP" | "CLAUDE" | "BUSCA"`
  - `export async function notaExistsByChave(userId: number, chave: string): Promise<boolean>`

- [ ] **Step 1: Teste type-level (falha: "BUSCA" não é Fonte)**

`lib/__tests__/db.fonte.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Fonte } from "@/lib/db";

describe("Fonte", () => {
  it("inclui BUSCA", () => {
    const f: Fonte = "BUSCA";
    expect(f).toBe("BUSCA");
  });
});
```

- [ ] **Step 2: Rodar typecheck e ver falhar**

Run: `npx tsc --noEmit`
Expected: erro — `"BUSCA"` não é atribuível a `Fonte`.

- [ ] **Step 3: Ampliar `Fonte` e adicionar o helper**

Em `lib/db.ts`, alterar a linha do tipo:

```ts
export type Fonte = "PDF" | "XLSX" | "NFP" | "CLAUDE" | "BUSCA";
```

E adicionar (perto de `upsertNota`):

```ts
export async function notaExistsByChave(userId: number, chave: string): Promise<boolean> {
  await ready();
  const rows = (await sql()`
    SELECT 1 FROM notas
     WHERE user_id = ${userId} AND chave_acesso = ${chave}
     LIMIT 1
  `) as Array<{ "?column?": number }>;
  return rows.length > 0;
}
```

- [ ] **Step 4: Rodar testes + typecheck**

Run: `npx vitest run lib/__tests__/db.fonte.test.ts && npx tsc --noEmit`
Expected: PASS e typecheck limpo.

- [ ] **Step 5: Commitar**

```bash
git add lib/db.ts lib/__tests__/db.fonte.test.ts
git commit -m "feat(db): fonte BUSCA + notaExistsByChave"
```

---

### Task 6: Endpoint `POST /api/buscar-nota`

Orquestra: auth → resolve chave → unsupported_uf → dedup → busca → parse (regex → IA) → upsert. Espelha o padrão de `app/api/upload/route.ts`.

**Files:**
- Create: `app/api/buscar-nota/route.ts`
- Create: `app/api/buscar-nota/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `extrairChave`, `buscarHtml` (`@/lib/portais/sp`); `parseNfceHtml` (`@/lib/parseMhtNfce`); `parseNfceTextViaClaude` (`@/lib/ocrNfce`); `notaExistsByChave`, `upsertNota`, `upsertEstabelecimento`, `recordNotaErro` (`@/lib/db`); `auth`, `userIdFromSession` (`@/auth`).
- Produces (resposta JSON):
  - `{ status: "ok"; action: "inserted" | "exists"; fonte: string; nota: { numero?: string; emitente?: string; total?: number; itens?: number; chave_acesso: string } }`
  - `{ status: "captcha"; message: string; url: string }`
  - `{ status: "unsupported_uf"; uf: string; message: string }`
  - `{ status: "invalid"; message: string }`
  - `{ status: "error"; message: string; url: string | null }`

- [ ] **Step 1: Escrever os testes (mock de auth/db/adapter/IA; parseNfceHtml real com fixture)**

`app/api/buscar-nota/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixtureHtml = readFileSync(
  resolve(__dirname, "../../../../lib/__tests__/fixtures/nfce-sp.html"),
  "utf8"
);

const CHAVE = "35".padEnd(44, "1"); // valor só para o mock; extrairChave é mockado

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { email: "a@b.com" } })),
  userIdFromSession: vi.fn(() => 1),
}));
vi.mock("@/lib/portais/sp", () => ({
  extrairChave: vi.fn(),
  buscarHtml: vi.fn(),
}));
vi.mock("@/lib/ocrNfce", () => ({
  parseNfceTextViaClaude: vi.fn(async () => ({ ok: false, partial: {} })),
}));
vi.mock("@/lib/db", () => ({
  notaExistsByChave: vi.fn(async () => false),
  upsertNota: vi.fn(async () => ({ id: 10, action: "inserted" })),
  upsertEstabelecimento: vi.fn(async () => "inserted"),
  recordNotaErro: vi.fn(async () => "inserted"),
}));

import { POST } from "@/app/api/buscar-nota/route";
import { extrairChave, buscarHtml } from "@/lib/portais/sp";
import { notaExistsByChave, upsertNota, recordNotaErro } from "@/lib/db";

function req(body: unknown) {
  return new Request("http://t/api/buscar-nota", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (extrairChave as any).mockReturnValue({
    chave: CHAVE,
    uf: "35",
    url: "https://www.nfce.fazenda.sp.gov.br/qrcode?p=x",
  });
});

describe("POST /api/buscar-nota", () => {
  it("input vazio → invalid 400", async () => {
    const res = await POST(req({ input: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).status).toBe("invalid");
  });

  it("UF não-SP → unsupported_uf", async () => {
    (extrairChave as any).mockReturnValue({ chave: CHAVE, uf: "26", url: null });
    const res = await POST(req({ input: "x" }));
    expect((await res.json()).status).toBe("unsupported_uf");
  });

  it("nota já existente → ok/exists, sem buscar", async () => {
    (notaExistsByChave as any).mockResolvedValue(true);
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.action).toBe("exists");
    expect(buscarHtml).not.toHaveBeenCalled();
  });

  it("captcha → status captcha, sem upsert", async () => {
    (buscarHtml as any).mockResolvedValue({ ok: false, captcha: true });
    const res = await POST(req({ input: "x" }));
    expect((await res.json()).status).toBe("captcha");
    expect(upsertNota).not.toHaveBeenCalled();
  });

  it("HTML válido → ok/inserted, fonte BUSCA, upsert chamado", async () => {
    (buscarHtml as any).mockResolvedValue({ ok: true, html: fixtureHtml });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.action).toBe("inserted");
    expect(body.fonte).toBe("BUSCA");
    expect(upsertNota).toHaveBeenCalledOnce();
  });

  it("parse falha e IA falha → error + recordNotaErro", async () => {
    (buscarHtml as any).mockResolvedValue({ ok: true, html: "<html>lixo</html>" });
    const res = await POST(req({ input: "x" }));
    expect((await res.json()).status).toBe("error");
    expect(recordNotaErro).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run app/api/buscar-nota/__tests__/route.test.ts`
Expected: FAIL — rota não existe.

- [ ] **Step 3: Implementar a rota**

`app/api/buscar-nota/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth, userIdFromSession } from "@/auth";
import { NotaParseError } from "@/lib/parseNfce";
import { parseNfceHtml } from "@/lib/parseMhtNfce";
import { parseNfceTextViaClaude } from "@/lib/ocrNfce";
import { extrairChave, buscarHtml } from "@/lib/portais/sp";
import {
  notaExistsByChave,
  upsertNota,
  upsertEstabelecimento,
  recordNotaErro,
  type ParsedNota,
} from "@/lib/db";

export const runtime = "nodejs";

async function safeRecordErro(
  userId: number,
  chave: string,
  erro: string,
  numero: string | null = null
) {
  try {
    await recordNotaErro(userId, {
      nome_arquivo: `busca:${chave}`,
      erro,
      numero,
      chave_acesso: chave,
      file_sha256: createHash("sha256").update(chave).digest("hex"),
      parsed_partial: null,
    });
  } catch (e) {
    console.error("[buscar-nota] recordNotaErro falhou:", e);
  }
}

export async function POST(request: Request) {
  const userId = userIdFromSession(await auth());
  if (!userId) {
    return NextResponse.json({ status: "invalid", message: "Não autenticado." }, { status: 401 });
  }

  let input = "";
  try {
    const body = (await request.json()) as { input?: unknown };
    if (typeof body?.input === "string") input = body.input;
  } catch {
    /* corpo inválido cai no check abaixo */
  }
  if (!input.trim()) {
    return NextResponse.json(
      { status: "invalid", message: "Informe a URL ou a chave da nota." },
      { status: 400 }
    );
  }

  const resolved = extrairChave(input);
  if (!resolved) {
    return NextResponse.json({
      status: "invalid",
      message: "Não reconheci uma NFC-e válida nesse QR/chave.",
    });
  }
  if (resolved.uf !== "35" || !resolved.url) {
    return NextResponse.json({
      status: "unsupported_uf",
      uf: resolved.uf,
      message: "Por enquanto a busca automática cobre só São Paulo. Use o envio de arquivo.",
    });
  }

  if (await notaExistsByChave(userId, resolved.chave)) {
    return NextResponse.json({
      status: "ok",
      action: "exists",
      fonte: "BUSCA",
      nota: { chave_acesso: resolved.chave },
    });
  }

  const fetched = await buscarHtml(resolved.url);
  if (!fetched.ok) {
    if (fetched.captcha) {
      return NextResponse.json({
        status: "captcha",
        url: resolved.url,
        message: "O site da Fazenda pediu captcha. Abra a nota e envie o arquivo.",
      });
    }
    await safeRecordErro(userId, resolved.chave, fetched.erro ?? "Falha na busca");
    return NextResponse.json({
      status: "error",
      url: resolved.url,
      message: "Não consegui buscar a nota agora. Tente o envio de arquivo.",
    });
  }

  let nota: ParsedNota;
  let fonte = "BUSCA";
  try {
    nota = { ...parseNfceHtml(fetched.html), fonte: "BUSCA" };
  } catch (err) {
    const claude = await parseNfceTextViaClaude(fetched.html);
    if (claude.ok) {
      nota = claude.nota;
      fonte = "CLAUDE";
    } else {
      const hint = err instanceof NotaParseError ? err.hint : {};
      await safeRecordErro(
        userId,
        resolved.chave,
        err instanceof Error ? err.message : "Parse falhou",
        hint.numero ?? null
      );
      return NextResponse.json({
        status: "error",
        url: resolved.url,
        message: "Busquei a nota mas não consegui ler os itens. Tente o envio de arquivo.",
      });
    }
  }

  const res = await upsertNota(userId, nota);
  if (nota.cnpj && nota.endereco) {
    await upsertEstabelecimento({
      cnpj: nota.cnpj,
      razao_social: nota.emitente,
      logradouro: nota.endereco.logradouro,
      numero: nota.endereco.numero,
      complemento: nota.endereco.complemento,
      bairro: nota.endereco.bairro,
      municipio: nota.endereco.municipio,
      uf: nota.endereco.uf,
      fonte: "PDF",
    });
  }

  return NextResponse.json({
    status: "ok",
    action: res.action === "inserted" ? "inserted" : "exists",
    fonte,
    nota: {
      numero: nota.numero,
      emitente: nota.emitente,
      total: nota.valor_total,
      itens: nota.itens.length,
      chave_acesso: nota.chave_acesso,
    },
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run app/api/buscar-nota/__tests__/route.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commitar**

```bash
git add app/api/buscar-nota/route.ts app/api/buscar-nota/__tests__/route.test.ts
git commit -m "feat(api): endpoint buscar-nota (busca automática NFC-e SP)"
```

---

### Task 7: Frontend — QR busca direto + campo colar/digitar

`QrScanButton` passa a delegar a URL detectada via callback; `UploadDropzone` ganha a lógica de busca (compartilhada por QR e pelo novo campo de colar/digitar) e reusa o painel de resultados, com botão de fallback "abrir no site da Fazenda".

**Files:**
- Modify: `app/QrScanButton.tsx`
- Modify: `app/UploadDropzone.tsx`

**Interfaces:**
- `QrScanButton` recebe prop `onDetect: (url: string) => void` e, ao detectar uma URL de Fazenda, chama `onDetect(url)` e fecha o modal (em vez de `window.open`).
- `UploadDropzone` implementa `buscarNota(input: string)` que faz `POST /api/buscar-nota`, mapeia a resposta para um item do painel de resultados e, em `captcha`/`error`, guarda a `url` para o botão de fallback.

- [ ] **Step 1: Adicionar a prop `onDetect` ao `QrScanButton`**

Em `app/QrScanButton.tsx`:
- Mudar a assinatura: `export default function QrScanButton({ onDetect }: { onDetect: (url: string) => void })`.
- No callback do scanner, no ramo `if (NFCE_URL_RE.test(url))`, trocar:

```ts
          scanner.stop();
          window.open(url, "_blank", "noopener,noreferrer");
          setOpen(false);
```
por:
```ts
          scanner.stop();
          onDetect(url);
          setOpen(false);
```
- Atualizar o texto do rodapé do modal de "Ao detectar, a página da Fazenda abre em uma nova aba." para "Ao detectar, busco a nota automaticamente."

- [ ] **Step 2: Implementar `buscarNota` + estado de fallback no `UploadDropzone`**

Em `app/UploadDropzone.tsx`, dentro do componente, adicionar a resposta tipada e a função (reusa `setResults`, `setBusy`, `router.refresh()`):

```ts
type BuscaResponse =
  | { status: "ok"; action: "inserted" | "exists"; fonte: string;
      nota: { numero?: string; emitente?: string; total?: number; itens?: number; chave_acesso: string } }
  | { status: "captcha"; message: string; url: string }
  | { status: "unsupported_uf"; uf: string; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string; url: string | null };

const buscarNota = async (input: string) => {
  if (!input.trim() || busy) return;
  setBusy(true);
  setResults([]);
  try {
    const res = await fetch("/api/buscar-nota", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const data = (await res.json()) as BuscaResponse;
    if (data.status === "ok") {
      const inserted = data.action === "inserted";
      setResults([{
        name: data.nota.emitente ? `${data.nota.emitente}` : "Nota buscada",
        status: "ok",
        fonte: data.fonte,
        notas: [{
          numero: data.nota.numero ?? "—",
          emitente: data.nota.emitente ?? "—",
          total: data.nota.total ?? 0,
          itens: data.nota.itens ?? 0,
          action: inserted ? "inserted" : "skipped",
          fonte: data.fonte,
        }],
      }]);
      router.refresh();
    } else {
      const url = "url" in data ? data.url : null;
      setResults([{ name: "Busca automática", status: "error", error: data.message }]);
      setFallbackUrl(url);
    }
  } catch (err) {
    setResults([{ name: "Busca automática", status: "error", error: err instanceof Error ? err.message : "Erro." }]);
  } finally {
    setBusy(false);
  }
};
```

Adicionar o estado: `const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);` e, em `buscarNota` no ramo `ok`, `setFallbackUrl(null)`.

- [ ] **Step 3: Trocar `<QrScanButton />` e adicionar o campo de colar/digitar**

No JSX do `UploadDropzone`, substituir `<QrScanButton />` por:

```tsx
      <QrScanButton onDetect={(url) => buscarNota(url)} />

      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>
          Ou cole a URL do QR Code ou a chave de acesso (44 dígitos):
        </label>
        <PasteBuscaField onBuscar={buscarNota} busy={busy} />
      </div>

      {fallbackUrl && (
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: 10, color: C.accent, fontSize: 12 }}
        >
          Abrir no site da Fazenda e baixar o arquivo →
        </a>
      )}
```

E adicionar, no fim do arquivo, o subcomponente:

```tsx
function PasteBuscaField({ onBuscar, busy }: { onBuscar: (v: string) => void; busy: boolean }) {
  const [v, setV] = useState("");
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onBuscar(v); }}
        placeholder="https://www.nfce.fazenda.sp.gov.br/qrcode?p=…  ou  3526…"
        disabled={busy}
        style={{
          flex: 1, background: C.panel2, border: `1px solid ${C.line}`,
          borderRadius: 8, padding: "8px 10px", color: C.ink, fontSize: 12,
        }}
      />
      <button
        type="button"
        onClick={() => onBuscar(v)}
        disabled={busy}
        style={{
          background: C.accent, color: "#0c0f0d", border: "none",
          borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        Buscar
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck e build**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run build`
Expected: build conclui sem erro (a rota `/api/buscar-nota` aparece na lista).

- [ ] **Step 5: Commitar**

```bash
git add app/QrScanButton.tsx app/UploadDropzone.tsx
git commit -m "feat(ui): QR busca direto + campo colar/digitar chave"
```

---

### Task 8: Verificação local contra o portal real

Valida a suposição externa (URL `/qrcode?p=` retorna o HTML com itens, sem captcha em baixo volume; charset correto) e faz o walkthrough end-to-end no dev server. **Requer uma NFC-e SP recente do usuário.**

**Files:**
- (possível) Modify: `lib/portais/sp.ts` (ajuste de 1 linha na URL/charset, se a verificação exigir)

- [ ] **Step 1: Obter uma URL/chave real de NFC-e SP recente**

Pedir ao usuário o conteúdo do QR de uma NFC-e SP recente (URL completa `https://www.nfce.fazenda.sp.gov.br/qrcode?p=…`) ou a chave de 44 dígitos.

- [ ] **Step 2: Provar a busca server-side isolada**

Com a URL real em `$URL`, rodar:

```bash
npx tsx -e "import {extrairChave,buscarHtml} from './lib/portais/sp'; const r=extrairChave(process.argv[1]); console.log('resolved',r); if(r?.url){const f=await buscarHtml(r.url); console.log('ok?',f.ok, f.ok?('html '+f.html.length+' bytes'):f);}" "$URL"
```
Expected: `resolved` com `uf: "35"` e `url` preenchida; `ok? true` com HTML de alguns KB. Se vier `captcha:true` ou mojibake nos acentos, ajustar `decodeHtml`/URL em `lib/portais/sp.ts` e repetir.

- [ ] **Step 3: Confirmar o parse do HTML real**

```bash
npx tsx -e "import {extrairChave,buscarHtml} from './lib/portais/sp'; import {parseNfceHtml} from './lib/parseMhtNfce'; const r=extrairChave(process.argv[1]); const f=await buscarHtml(r.url); if(f.ok){const n=parseNfceHtml(f.html); console.log(n.emitente, n.data_emissao, n.valor_total, n.itens.length+' itens');}" "$URL"
```
Expected: emitente, data, total e ≥1 item coerentes com a nota.

- [ ] **Step 4: Walkthrough no dev server**

```bash
npm run dev
```
- Logar, abrir a home (Dashboard).
- Colar a URL/chave no campo novo → "Buscar" → a nota aparece no painel e some o card de upload manual; recarregar mostra a nota no dashboard.
- Repetir a mesma chave → resultado "já existia" (dedup), sem nova busca.
- (Celular/HTTPS via ngrok) escanear o QR → busca direto e salva.
- Forçar um erro (ex.: chave de outra UF) → mensagem de `unsupported_uf` + link de fallback.

- [ ] **Step 5: Rodar a suíte completa e o build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: tudo verde.

- [ ] **Step 6: Commitar ajustes (se houver)**

```bash
git add -A
git commit -m "fix(portais): ajustes da busca SP após verificação local"
```

---

### Task 9: Documentação

Atualiza o README para refletir a busca automática e a nova `fonte`.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Atualizar a seção "Fontes de dados aceitas"**

Adicionar uma linha na tabela de fontes:

```markdown
| **Busca automática** (`fonte: "BUSCA"`) | Cabeçalho + itens + chave + endereço, buscados direto no portal | QR/chave de NFC-e SP, sem upload (`/api/buscar-nota`) |
```

E um parágrafo curto após a tabela explicando: scan do QR ou colar URL/chave → o backend busca o HTML no portal SP, reusa o parser e salva; captcha/erro degrada para o upload manual; só SP no momento.

- [ ] **Step 2: Commitar**

```bash
git add README.md
git commit -m "docs: documenta busca automática de NFC-e (SP)"
```

---

## Self-Review

**Spec coverage:**
- Entrada QR + colar/digitar → Task 7 (QrScanButton.onDetect + PasteBuscaField). ✓
- Só SP, arquitetura extensível (`lib/portais/`) → Tasks 3-4 (diretório por UF). ✓
- Fallback manual em toda falha → Task 6 (status captcha/error/unsupported_uf) + Task 7 (link de fallback). ✓
- Busca server-side, reuso de parser → Tasks 2, 6. ✓
- Dedup por chave antes de buscar → Tasks 5, 6 (`notaExistsByChave`). ✓
- Fallback IA reusado → Task 6 (`parseNfceTextViaClaude`). ✓
- QR busca e salva direto → Task 7. ✓
- Anti-SSRF (host allowlist) → Task 3. ✓
- Sem retry em captcha → Task 6. ✓
- Testes unit + integração com fetch mockado → Tasks 2,3,4,6. ✓

**Placeholders:** A URL/charset de SP em `buscarHtml` (Task 4) é um valor concreto com verificação explícita na Task 8 — não é placeholder. Nenhum "TBD"/"TODO" no plano.

**Type consistency:** `ChaveResolvida {chave, uf, url}`, `FetchResult`, `Fonte` com `"BUSCA"`, e a resposta do endpoint (`status`/`action`/`nota`) são usados de forma idêntica entre Tasks 3,4,5,6,7. `parseNfceHtml(html): ParsedNota` consistente entre Tasks 2 e 6.
