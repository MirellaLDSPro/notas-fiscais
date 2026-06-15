import { cnpjDigits } from "./db";

export type BrasilApiCnpj = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
};

export type BrasilApiResult =
  | { ok: true; data: BrasilApiCnpj }
  | { ok: false; status: number | "timeout" | "network"; message: string };

declare global {
  // eslint-disable-next-line no-var
  var __brasilApiCache: Map<string, BrasilApiResult> | undefined;
}
const cache = (globalThis.__brasilApiCache ??= new Map<string, BrasilApiResult>());

export async function lookupCnpj(rawCnpj: string): Promise<BrasilApiResult> {
  const cnpj = cnpjDigits(rawCnpj);
  if (cnpj.length !== 14) {
    return { ok: false, status: 400, message: `CNPJ inválido: ${rawCnpj}` };
  }
  const cached = cache.get(cnpj);
  if (cached) return cached;

  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
  let result: BrasilApiResult;
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; dashboard-nfce/0.1; +https://github.com/local)",
      },
    });
    if (!r.ok) {
      result = { ok: false, status: r.status, message: `${r.status} ${r.statusText}` };
    } else {
      const json = (await r.json()) as Record<string, unknown>;
      result = {
        ok: true,
        data: {
          cnpj,
          razao_social: (json.razao_social as string) ?? null,
          nome_fantasia: (json.nome_fantasia as string) ?? null,
          logradouro: (json.logradouro as string) ?? null,
          numero: (json.numero as string) ?? null,
          complemento: (json.complemento as string) ?? null,
          bairro: (json.bairro as string) ?? null,
          municipio: (json.municipio as string) ?? null,
          uf: (json.uf as string) ?? null,
          cep: (json.cep as string) ?? null,
        },
      };
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      result = { ok: false, status: "timeout", message: "BrasilAPI timeout (7s)" };
    } else {
      result = {
        ok: false,
        status: "network",
        message: err instanceof Error ? err.message : "Erro de rede",
      };
    }
  }
  if (result.ok) cache.set(cnpj, result);
  return result;
}
