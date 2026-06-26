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

export type ChaveResolvida = { chave: string; uf: string; url: string | null; ufSuportada: boolean };

function digitoVerificadorOk(chave: string): boolean {
  if (chave.length !== 44 || !/^\d{44}$/.test(chave)) return false;
  const base = chave.slice(0, 43);
  const dv = Number(chave[43]);
  let peso = 2,
    soma = 0;
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
