export const SP_NFCE_HOSTS = ["www.nfce.fazenda.sp.gov.br", "nfce.fazenda.sp.gov.br"];

export type ChaveResolvida = { chave: string; uf: string; url: string | null };

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
  let urlSp: string | null = null;
  let fromUrl = false;

  if (/^https?:\/\//i.test(trimmed)) {
    fromUrl = true;
    let u: URL;
    try {
      u = new URL(trimmed);
    } catch {
      return null;
    }
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
  // urlSp: URL de host SP que o usuário forneceu. Caso contrário, só montamos a
  // URL canônica SP a partir de chave CRUA (não de uma URL de host não-SP).
  const url =
    urlSp ?? (!fromUrl && uf === "35" ? `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${chave}` : null);
  return { chave, uf, url };
}
