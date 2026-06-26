# Busca automática de NFC-e (PE) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Liberar a busca automática de NFC-e (hoje em prod só p/ SP) também para Pernambuco (UF 26), via QR/URL.

**Architecture:** Introduz um **registro de UF** (`PORTAIS`) em `lib/portais/sp.ts` com `{ hosts, urlFromChave }` por estado. `extrairChave` fica UF-agnóstico e passa a devolver `ufSuportada`. O gate de UF no endpoint vira 3 casos. `buscarHtml`/`detectarCaptcha`/`parseNfceHtml` não mudam (o parser já lê PE).

**Tech Stack:** Next.js 16, TypeScript, Vitest. Neon (Postgres). NextAuth v5.

## Global Constraints

- **PE só via QR/URL:** `urlFromChave` de PE retorna `null`; chave PE digitada não busca.
- **Allowlist anti-SSRF:** `extrairChave` só mantém `url` se o `hostname` estiver em `PORTAIS[*].hosts`; `buscarHtml` nunca recebe host arbitrário.
- **Escopo SP+PE apenas:** sem generalização especulativa (sem hash por CSC, sem outras UFs).
- **Arquivo:** manter o módulo em `lib/portais/sp.ts` (sem renomear) para evitar churn de import em `route.ts` + 3 arquivos de teste. Comentar no topo que agora é multi-UF.
- **Não mudar** `buscarHtml`, `detectarCaptcha`, `decodeHtml`, `parseNfceHtml`.
- Mensagens (copy) exatas conforme cada task.

---

### Task 1: Registro de UF + `extrairChave` UF-agnóstico

**Files:**
- Modify: `lib/portais/sp.ts` (linha 1: `SP_NFCE_HOSTS`; linha 3: tipo `ChaveResolvida`; linhas 20-54: `extrairChave`)
- Test: `lib/portais/__tests__/sp.extrairChave.test.ts`

**Interfaces:**
- Consumes: `digitoVerificadorOk` (já existe no arquivo, linhas 5-18, sem mudança).
- Produces:
  - `export type PortalUF = { uf: string; hosts: string[]; urlFromChave: (chave: string) => string | null }`
  - `export const PORTAIS: Record<string, PortalUF>`
  - `export type ChaveResolvida = { chave: string; uf: string; url: string | null; ufSuportada: boolean }`
  - `export function extrairChave(input: string): ChaveResolvida | null`

- [ ] **Step 1: Atualizar/escrever os testes (failing)**

Substituir o teste `"chave de outra UF resolve mas sem url (não-SP)"` e adicionar os novos. No arquivo, logo após a definição de `CHAVE_PE` (linha 18), adicionar:

```ts
const CHAVE_RJ = comDV("33" + "2106".padEnd(41, "7").slice(0, 41)); // UF 33 = RJ (fora do registro)
```

Substituir o bloco do teste atual (linhas 35-39):

```ts
  it("chave de outra UF resolve mas sem url (não-SP)", () => {
    const r = extrairChave(CHAVE_PE);
    expect(r?.uf).toBe("26");
    expect(r?.url).toBeNull();
  });
```

por:

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
Expected: FAIL — `ufSuportada` é `undefined` (campo não existe ainda) e o teste da URL PE falha (`url` vem `null` hoje, pois só SP é allowlistado).

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
  // URL: a do QR (se host allowlistado) OU a canônica montada da chave crua
  // (só quando o portal sabe montar — SP sim, PE não).
  const url = urlAllowlisted ?? (!fromUrl && portal ? portal.urlFromChave(chave) : null);
  return { chave, uf, url, ufSuportada: portal !== null };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/portais/__tests__/sp.extrairChave.test.ts`
Expected: PASS (6 testes — os 5 SP/genéricos atuais + os novos).

- [ ] **Step 5: Commit**

```bash
git add lib/portais/sp.ts lib/portais/__tests__/sp.extrairChave.test.ts
git commit -m "feat(portais): registro de UF + extrairChave agnóstico (SP+PE)"
```

---

### Task 2: Gate de UF em 3 casos no endpoint

**Files:**
- Modify: `app/api/buscar-nota/route.ts` (linhas 58-71: bloco após `extrairChave`)
- Test: `app/api/buscar-nota/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `extrairChave` retornando `{ chave, uf, url, ufSuportada }` (Task 1).

- [ ] **Step 1: Atualizar os testes (failing)**

No `beforeEach` (linhas 46-50), o mock default de `extrairChave` precisa incluir `ufSuportada: true`:

```ts
  (extrairChave as any).mockReturnValue({
    chave: CHAVE,
    uf: "35",
    url: "https://www.nfce.fazenda.sp.gov.br/qrcode?p=x",
    ufSuportada: true,
  });
```

Substituir o teste `"UF não-SP → unsupported_uf"` (linhas 62-66) por (agora usa UF fora do registro, RJ):

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

  it("URL PE válida → ok/inserted (parser lê PE)", async () => {
    (extrairChave as any).mockReturnValue({
      chave: CHAVE,
      uf: "26",
      url: "https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?p=x",
      ufSuportada: true,
    });
    (buscarHtml as any).mockResolvedValue({ ok: true, html: fixtureHtml });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.action).toBe("inserted");
    expect(body.fonte).toBe("BUSCA");
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run app/api/buscar-nota/__tests__/route.test.ts`
Expected: FAIL — o teste "chave PE digitada → invalid" falha (gate atual devolve `unsupported_uf` para uf≠35) e o "URL PE → ok" falha (gate atual barra uf 26).

- [ ] **Step 3: Implementar o gate de 3 casos**

Substituir o bloco (linhas 65-71):

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
    // UF suportada mas sem URL buscável (ex.: chave PE digitada).
    return NextResponse.json({
      status: "invalid",
      message:
        "Escaneie o QR Code da nota (a chave digitada não dá pra buscar automaticamente) ou envie o arquivo.",
    });
  }
```

- [ ] **Step 4: Rodar e ver passar (arquivo + suíte completa)**

Run: `npx vitest run app/api/buscar-nota/__tests__/route.test.ts`
Expected: PASS (8 testes).
Run: `npx vitest run`
Expected: PASS (toda a suíte verde, sem warnings novos).

- [ ] **Step 5: Commit**

```bash
git add app/api/buscar-nota/route.ts app/api/buscar-nota/__tests__/route.test.ts
git commit -m "feat(api): libera busca automática para PE (gate de UF em 3 casos)"
```

---

### Task 3: Cópia da UI (SP → SP/PE)

**Files:**
- Modify: `app/UploadDropzone.tsx` (texto de ajuda ~linha 144; `placeholder` do campo, linha 288)

**Interfaces:** nenhuma (somente texto). `QrScanButton.tsx` já casa `sefaz.pe.gov.br` na regex — sem mudança.

- [ ] **Step 1: Atualizar o placeholder do campo colar/digitar**

Substituir (linha 288):

```tsx
        placeholder="https://www.nfce.fazenda.sp.gov.br/qrcode?p=…  ou  3526…"
```

por:

```tsx
        placeholder="URL do QR (SP/PE) ou chave de 44 dígitos (SP)"
```

- [ ] **Step 2: Ajustar o texto de ajuda do label**

Substituir (linhas 193-195):

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

- [ ] **Step 3: Verificar (sem teste automatizado — é cópia)**

Run: `npx tsc --noEmit` (garante que não quebrou JSX/tipos)
Expected: sem erros novos.
Run: `grep -n "SP/PE" app/UploadDropzone.tsx`
Expected: as duas linhas novas aparecem.

- [ ] **Step 4: Commit**

```bash
git add app/UploadDropzone.tsx
git commit -m "feat(ui): cópia da busca menciona SP e PE"
```

---

## Validação manual (pós-implementação — risco empírico)

Não há teste automatizado para isto (precisa de rede + cupom real). Após as 3 tasks:

1. Subir `npm run dev`, autenticar, e **buscar uma NFC-e PE real escaneando o QR** (ou colando a URL completa do portal PE, com o `|hash`).
2. Confirmar resposta `status:"ok"`, `fonte:"BUSCA"` (parser determinístico lê PE) e nota gravada.
3. Conferir que uma **chave PE digitada** (ex.: `26260608868231000808650050000140891050162667`) devolve `invalid` com a mensagem "escaneie o QR".

Se PE exigir captcha na URL do QR, o fluxo degrada para `captcha` → fallback de arquivo (não quebra), mas a busca automática não entregaria para PE — reportar como achado.

## Self-Review (preenchido)

- **Cobertura da spec:** registro de UF (Task 1), extrairChave agnóstico + ufSuportada (Task 1), gate 3 casos (Task 2), allowlist anti-SSRF (Task 1, `if (portal)`), cópia UI (Task 3), testes incl. chave `2626…2667` (validação manual + Task 2 caso PE-digitada), risco empírico (seção validação). ✓
- **Placeholders:** nenhum — todo passo tem código/comando exatos. ✓
- **Consistência de tipos:** `ChaveResolvida` (com `ufSuportada`) definido na Task 1 e consumido na Task 2; `PORTAIS`/`PortalUF` só na Task 1. Mocks da Task 2 incluem `ufSuportada`. ✓
