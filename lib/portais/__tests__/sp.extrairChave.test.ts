import { describe, it, expect } from "vitest";
import { extrairChave } from "@/lib/portais/sp";

// Chave SP (UF 35) válida com DV correto, montada para o teste.
// 43 dígitos base + DV calculado por mod-11.
function comDV(base43: string): string {
  let peso = 2,
    soma = 0;
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
