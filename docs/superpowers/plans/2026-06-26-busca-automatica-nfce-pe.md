# Busca automática de NFC-e (PE) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Liberar a busca automática de NFC-e (hoje em prod só p/ SP) também para Pernambuco (UF 26), via QR/URL.

**Architecture:** Registro de UF (`PORTAIS`) em `lib/portais/sp.ts` com `{ hosts, urlFromChave }` por estado; `extrairChave` vira UF-agnóstico e devolve `ufSuportada`. **PE devolve XML cru da NFe** (não HTML como SP), então adiciona-se `parseNfceXml`; o endpoint faz dispatch XML/HTML antes do fallback Claude. Gate de UF em 3 casos.

**Tech Stack:** Next.js 16, TypeScript, Vitest. Neon (Postgres). NextAuth v5.

## Global Constraints

- **PE só via QR/URL:** `urlFromChave` de PE retorna `null`; chave PE digitada não busca.
- **PE devolve XML** (`text/xml`, `nfeProc`/NFe 4.00); SP devolve HTML. Parser escolhido por formato.
- **Allowlist anti-SSRF:** `extrairChave` só mantém `url` se o `hostname` ∈ `PORTAIS[*].hosts`.
- **Escopo SP+PE apenas:** sem generalização especulativa.
- **Arquivo `lib/portais/sp.ts` mantém o nome** (evita churn de import); comentar que é multi-UF.
- **Não mudar** `buscarHtml`, `detectarCaptcha`, `parseNfceHtml`.
- Fixture real: `lib/__tests__/fixtures/nfce-pe.xml` (já salvo — nota PADARIA/Recife, 4 itens, R$13,64).

---

### Task 1: Registro de UF + `extrairChave` UF-agnóstico

**Files:**
- Modify: `lib/portais/sp.ts` (linha 1: `SP_NFCE_HOSTS`; linha 3: tipo `ChaveResolvida`; linhas 20-54: `extrairChave`)
- Test: `lib/portais/__tests__/sp.extrairChave.test.ts`

**Interfaces:**
- Consumes: `digitoVerificadorOk` (já existe, linhas 5-18, sem mudança).
- Produces:
  - `export type PortalUF = { uf: string; hosts: string[]; urlFromChave: (chave: string) => string | null }`
  - `export const PORTAIS: Record<string, PortalUF>`
  - `export type ChaveResolvida = { chave: string; uf: string; url: string | null; ufSuportada: boolean }`
  - `export function extrairChave(input: string): ChaveResolvida | null`

- [ ] **Step 1: Atualizar/escrever os testes (failing)**

Após a definição de `CHAVE_PE` (linha 18), adicionar:

```ts
const CHAVE_RJ = comDV("33" + "2106".padEnd(41, "7").slice(0, 41)); // UF 33 = RJ (fora do registro)
```

Substituir o bloco do teste atual (linhas 35-39, `"chave de outra UF resolve mas sem url (não-SP)"`) por:

```ts
  it("chave PE crua: UF suportada, mas sem url (PE só via QR)", () => {
    const r = extrairChave(CHAVE_PE);
    expect(r?.uf).toBe("26");
    expect(r?.url).toBeNull();
    expect(r?.ufSuportada).toBe(true);
  });

  it("aceita URL do portal PE e mantém a url (host na allowlist)", () => {
    const url = `https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?p=${CHAVE_PE}|2|1|1|ABCDEF`;
    const r = extrairChave(url);
    expect(r?.chave).toBe(CHAVE_PE);
    expect(r?.uf).toBe("26");
    expect(r?.url).toBe(url);
    expect(r?.ufSuportada).toBe(true);
  });

  it("UF fora do registro (RJ) → ufSuportada false", () => {
    const r = extrairChave(CHAVE_RJ);
    expect(r?.uf).toBe("33");
    expect(r?.ufSuportada).toBe(false);
    expect(r?.url).toBeNull();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/portais/__tests__/sp.extrairChave.test.ts`
Expected: FAIL — `ufSuportada` indefinido; e o teste da URL PE falha (hoje só SP é allowlistado).

- [ ] **Step 3: Implementar o registro + reescrever `extrairChave`**

Substituir a **linha 1** (`export const SP_NFCE_HOSTS = [...]`) por:

```ts
export type PortalUF = {
  uf: string;
  hosts: string[]; // hostnames sem porta (u.hostname já remove a porta)
  urlFromChave: (chave: string) => string | null;
};

// Registro de portais por UF. Adicionar um estado = adicionar uma entrada.
export const PORTAIS: Record<string, PortalUF> = {
  "35": {
    uf: "35",
    hosts: ["www.nfce.fazenda.sp.gov.br", "nfce.fazenda.sp.gov.br"],
    urlFromChave: (c) => `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${c}`,
  },
  "26": {
    uf: "26",
    hosts: ["nfce.sefaz.pe.gov.br"],
    urlFromChave: () => null, // PE: só via QR/URL (precisa do hash assinado)
  },
};

function portalPorHost(hostname: string): PortalUF | null {
  const h = hostname.toLowerCase();
  for (const p of Object.values(PORTAIS)) if (p.hosts.includes(h)) return p;
  return null;
}
```

Substituir a **linha 3** (`export type ChaveResolvida = ...`) por:

```ts
export type ChaveResolvida = { chave: string; uf: string; url: string | null; ufSuportada: boolean };
```

Substituir a função `extrairChave` (linhas 20-54) por:

```ts
export function extrairChave(input: string): ChaveResolvida | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  let chave = "";
  let urlAllowlisted: string | null = null;
  let fromUrl = false;

  if (/^https?:\/\//i.test(trimmed)) {
    fromUrl = true;
    let u: URL;
    try {
      u = new URL(trimmed);
    } catch {
      return null;
    }
    const portal = portalPorHost(u.hostname);
    const p = u.searchParams.get("p") ?? "";
    chave =
      p.split("|")[0].replace(/\D/g, "").match(/\d{44}/)?.[0] ??
      trimmed.replace(/\D/g, "").match(/\d{44}/)?.[0] ??
      "";
    // Só mantém a URL se o host estiver na allowlist (anti-SSRF).
    if (portal) urlAllowlisted = trimmed;
  } else {
    chave = trimmed.replace(/\D/g, "").match(/\d{44}/)?.[0] ?? "";
  }

  if (!digitoVerificadorOk(chave)) return null;
  const uf = chave.slice(0, 2);
  const portal = PORTAIS[uf] ?? null;
  const url = urlAllowlisted ?? (!fromUrl && portal ? portal.urlFromChave(chave) : null);
  return { chave, uf, url, ufSuportada: portal !== null };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/portais/__tests__/sp.extrairChave.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/portais/sp.ts lib/portais/__tests__/sp.extrairChave.test.ts
git commit -m "feat(portais): registro de UF + extrairChave agnóstico (SP+PE)"
```

---

### Task 2: Parser de XML da NFe (`parseNfceXml`)

**Files:**
- Create: `lib/parseNfceXml.ts`
- Test: `lib/__tests__/parseNfceXml.test.ts`
- Fixture (já existe): `lib/__tests__/fixtures/nfce-pe.xml`

**Interfaces:**
- Consumes: `NotaParseError` de `./parseNfce`; tipo `ParsedNota` de `./db`.
- Produces:
  - `export function looksLikeNfeXml(s: string): boolean`
  - `export function parseNfceXml(xml: string): ParsedNota`

- [ ] **Step 1: Escrever o teste (failing)**

Criar `lib/__tests__/parseNfceXml.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseNfceXml, looksLikeNfeXml } from "@/lib/parseNfceXml";

const xml = readFileSync(resolve(__dirname, "fixtures/nfce-pe.xml"), "utf8");

describe("parseNfceXml", () => {
  it("detecta XML da NFe e rejeita HTML", () => {
    expect(looksLikeNfeXml(xml)).toBe(true);
    expect(looksLikeNfeXml("<!DOCTYPE html><html><body>x</body></html>")).toBe(false);
  });

  it("extrai os campos da NFC-e PE (XML real)", () => {
    const n = parseNfceXml(xml);
    expect(n.emitente).toBe("PADARIA PASTELARIA IRAJA LTDA - ME");
    expect(n.cnpj).toBe("10817518000176");
    expect(n.numero).toBe("167583");
    expect(n.serie).toBe("2");
    expect(n.data_emissao).toBe("08/09/2020");
    expect(n.chave_acesso).toBe("26200910817518000176650020001675831482482919");
    expect(n.valor_total).toBe(13.64);
    expect(n.itens).toHaveLength(4);
    expect(n.itens[0].produto).toBe("SALG CEBOLA KG");
    expect(n.itens[0].un).toBe("UN"); // unidade limpa (sem o bug #17)
    expect(n.endereco?.municipio).toBe("RECIFE");
    expect(n.endereco?.uf).toBe("PE");
  });

  it("lança em XML sem itens", () => {
    expect(() => parseNfceXml("<nfeProc><NFe><infNFe Id=\"NFe" + "2".repeat(44) + "\"><ide><nNF>1</nNF><dhEmi>2020-01-01T00:00:00-03:00</dhEmi></ide></infNFe></NFe></nfeProc>")).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/__tests__/parseNfceXml.test.ts`
Expected: FAIL — `Cannot find module '@/lib/parseNfceXml'`.

- [ ] **Step 3: Implementar `lib/parseNfceXml.ts`**

```ts
import { NotaParseError } from "./parseNfce";
import type { ParsedNota } from "./db";

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeXml(m[1].trim()) : null;
}

export function looksLikeNfeXml(s: string): boolean {
  return /<\?xml|<nfeProc[\s>]|<NFe[\s>]|<infNFe[\s>]/i.test(s);
}

export function parseNfceXml(xml: string): ParsedNota {
  const chave = xml.match(/<infNFe[^>]*\bId="NFe(\d{44})"/i)?.[1] ?? null;

  const ide = xml.match(/<ide>([\s\S]*?)<\/ide>/i)?.[1] ?? "";
  const numero = tag(ide, "nNF");
  const serie = tag(ide, "serie");
  const dhEmi = tag(ide, "dhEmi"); // 2020-09-08T18:27:12-03:00
  const dm = dhEmi?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dataEmissao = dm ? `${dm[3]}/${dm[2]}/${dm[1]}` : null;
  if (!numero || !dataEmissao) {
    throw new NotaParseError("XML da NFe sem nNF/dhEmi.", { numero, chave_acesso: chave });
  }

  const emit = xml.match(/<emit>([\s\S]*?)<\/emit>/i)?.[1] ?? "";
  const emitente = tag(emit, "xNome") ?? "Emitente desconhecido";
  const cnpj = tag(emit, "CNPJ");
  const ender = emit.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/i)?.[1] ?? "";
  const endereco = ender
    ? {
        logradouro: tag(ender, "xLgr"),
        numero: tag(ender, "nro"),
        complemento: tag(ender, "xCpl"),
        bairro: tag(ender, "xBairro"),
        municipio: tag(ender, "xMun"),
        uf: tag(ender, "UF"),
      }
    : null;

  const itens: ParsedNota["itens"] = [];
  for (const det of xml.match(/<det\b[\s\S]*?<\/det>/gi) ?? []) {
    const prod = det.match(/<prod>([\s\S]*?)<\/prod>/i)?.[1];
    if (!prod) continue;
    const produto = tag(prod, "xProd");
    const vProd = tag(prod, "vProd");
    if (!produto || !vProd) continue;
    itens.push({
      produto,
      codigo: tag(prod, "cProd"),
      qt: Number(tag(prod, "qCom") ?? "0"),
      un: tag(prod, "uCom"),
      vu: Number(tag(prod, "vUnCom") ?? "0"),
      vt: Number(vProd),
    });
  }
  if (itens.length === 0) {
    throw new NotaParseError("XML da NFe sem itens.", { numero, chave_acesso: chave });
  }

  const icmsTot = xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i)?.[1] ?? "";
  const vNF = tag(icmsTot, "vNF");
  const valorTotal = vNF
    ? Number(vNF)
    : Math.round(itens.reduce((s, i) => s + i.vt, 0) * 100) / 100;

  return {
    numero,
    serie,
    data_emissao: dataEmissao,
    emitente,
    cnpj,
    chave_acesso: chave,
    valor_total: valorTotal,
    fonte: "PDF", // o route sobrescreve para "BUSCA"
    itens,
    endereco,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/__tests__/parseNfceXml.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/parseNfceXml.ts lib/__tests__/parseNfceXml.test.ts lib/__tests__/fixtures/nfce-pe.xml
git commit -m "feat(parse): parseNfceXml para o XML da NFe (PE)"
```

---

### Task 3: Endpoint — gate de UF (3 casos) + dispatch XML/HTML

**Files:**
- Modify: `app/api/buscar-nota/route.ts` (imports ~linha 5; gate linhas 65-71; parse linhas 99-102)
- Test: `app/api/buscar-nota/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `extrairChave` com `ufSuportada` (Task 1); `parseNfceXml`/`looksLikeNfeXml` (Task 2).

- [ ] **Step 1: Atualizar os testes (failing)**

No topo do arquivo de teste, após a leitura de `fixtureHtml` (linhas 5-8), adicionar a leitura do XML:

```ts
const fixtureXml = readFileSync(
  resolve(__dirname, "../../../../lib/__tests__/fixtures/nfce-pe.xml"),
  "utf8"
);
```

No `beforeEach` (linhas 46-50), incluir `ufSuportada: true` no mock default:

```ts
  (extrairChave as any).mockReturnValue({
    chave: CHAVE,
    uf: "35",
    url: "https://www.nfce.fazenda.sp.gov.br/qrcode?p=x",
    ufSuportada: true,
  });
```

Substituir o teste `"UF não-SP → unsupported_uf"` (linhas 62-66) por (RJ + os dois casos PE):

```ts
  it("UF fora do registro (RJ) → unsupported_uf", async () => {
    (extrairChave as any).mockReturnValue({ chave: CHAVE, uf: "33", url: null, ufSuportada: false });
    const res = await POST(req({ input: "x" }));
    expect((await res.json()).status).toBe("unsupported_uf");
    expect(buscarHtml).not.toHaveBeenCalled();
  });

  it("chave PE digitada (UF ok, sem url) → invalid, sem buscar", async () => {
    (extrairChave as any).mockReturnValue({ chave: CHAVE, uf: "26", url: null, ufSuportada: true });
    const res = await POST(req({ input: "x" }));
    expect((await res.json()).status).toBe("invalid");
    expect(buscarHtml).not.toHaveBeenCalled();
  });

  it("URL PE → XML parseado deterministicamente → ok/inserted, fonte BUSCA", async () => {
    (extrairChave as any).mockReturnValue({
      chave: CHAVE,
      uf: "26",
      url: "https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?p=x",
      ufSuportada: true,
    });
    (buscarHtml as any).mockResolvedValue({ ok: true, html: fixtureXml });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.action).toBe("inserted");
    expect(body.fonte).toBe("BUSCA");
    expect(body.nota.itens).toBe(4);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run app/api/buscar-nota/__tests__/route.test.ts`
Expected: FAIL — "chave PE digitada → invalid" e "URL PE → ok" falham (gate atual barra uf 26 e não há dispatch XML).

- [ ] **Step 3: Implementar gate + dispatch**

Adicionar o import (junto aos demais, após a linha que importa `parseNfceHtml`, ~linha 5):

```ts
import { parseNfceXml, looksLikeNfeXml } from "@/lib/parseNfceXml";
```

Substituir o gate (linhas 65-71):

```ts
  if (resolved.uf !== "35" || !resolved.url) {
    return NextResponse.json({
      status: "unsupported_uf",
      uf: resolved.uf,
      message: "Por enquanto a busca automática cobre só São Paulo. Use o envio de arquivo.",
    });
  }
```

por:

```ts
  if (!resolved.ufSuportada) {
    return NextResponse.json({
      status: "unsupported_uf",
      uf: resolved.uf,
      message: "Por enquanto a busca automática cobre São Paulo e Pernambuco. Use o envio de arquivo.",
    });
  }
  if (!resolved.url) {
    return NextResponse.json({
      status: "invalid",
      message:
        "Escaneie o QR Code da nota (a chave digitada não dá pra buscar automaticamente) ou envie o arquivo.",
    });
  }
```

Substituir a linha de parse (dentro do `try`, ~linha 102):

```ts
    nota = { ...parseNfceHtml(fetched.html), fonte: "BUSCA" };
```

por (dispatch pelo formato):

```ts
    const parsed = looksLikeNfeXml(fetched.html)
      ? parseNfceXml(fetched.html)
      : parseNfceHtml(fetched.html);
    nota = { ...parsed, fonte: "BUSCA" };
```

- [ ] **Step 4: Rodar e ver passar (arquivo + suíte completa)**

Run: `npx vitest run app/api/buscar-nota/__tests__/route.test.ts`
Expected: PASS (8 testes).
Run: `npx vitest run`
Expected: toda a suíte verde.

- [ ] **Step 5: Commit**

```bash
git add app/api/buscar-nota/route.ts app/api/buscar-nota/__tests__/route.test.ts
git commit -m "feat(api): PE na busca automática (gate 3 casos + dispatch XML/HTML)"
```

---

### Task 4: Cópia da UI (SP → SP/PE)

**Files:**
- Modify: `app/UploadDropzone.tsx` (label ~linhas 193-195; `placeholder` linha 288)

**Interfaces:** nenhuma (somente texto). `QrScanButton.tsx` já casa `sefaz.pe.gov.br`.

- [ ] **Step 1: Atualizar o placeholder (linha 288)**

```tsx
        placeholder="https://www.nfce.fazenda.sp.gov.br/qrcode?p=…  ou  3526…"
```

por:

```tsx
        placeholder="URL do QR (SP/PE) ou chave de 44 dígitos (SP)"
```

- [ ] **Step 2: Atualizar o texto de ajuda (linhas 193-195)**

```tsx
        <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>
          Ou cole a URL do QR Code ou a chave de acesso (44 dígitos):
        </label>
```

por:

```tsx
        <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>
          Cole a URL do QR Code (SP/PE) ou a chave de 44 dígitos (SP). Para PE, escaneie o QR.
        </label>
```

- [ ] **Step 3: Verificar (cópia, sem teste)**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add app/UploadDropzone.tsx
git commit -m "feat(ui): cópia da busca menciona SP e PE"
```

---

## Validação manual (pós-implementação)

Já confirmado nesta sessão: a URL do QR de PE **busca server-side sem captcha** e devolve XML; `parseNfceXml` lê o fixture real. Falta o end-to-end pelo endpoint rodando:

1. `npm run dev`, autenticar, e disparar `POST /api/buscar-nota` com a **URL real do QR de PE** (a do fixture serve): esperar `status:"ok"`, `fonte:"BUSCA"`, 4 itens, R$13,64.
2. Conferir que uma **chave PE digitada** (`26260608868231000808650050000140891050162667`) devolve `invalid` "escaneie o QR".
3. (Opcional) validar com uma NFC-e PE **recente** de outro emitente, caso o layout/ρversão do XML varie.

## Self-Review (preenchido)

- **Cobertura da spec (com revisão XML):** registro UF + extrairChave/ufSuportada (Task 1); `parseNfceXml` + `looksLikeNfeXml` + fixture (Task 2); gate 3 casos + dispatch XML/HTML (Task 3); allowlist anti-SSRF (Task 1); cópia UI (Task 4); risco empírico já validado (seção validação). ✓
- **Placeholders:** nenhum — código/comandos exatos em todo passo. ✓
- **Consistência de tipos:** `ChaveResolvida.ufSuportada` (Task 1) consumido na Task 3; `parseNfceXml`/`looksLikeNfeXml` (Task 2) consumidos na Task 3; `ParsedNota`/`ParsedItem`/`ParsedEndereco` batem com `lib/db.ts`. Mocks da Task 3 incluem `ufSuportada`. ✓
