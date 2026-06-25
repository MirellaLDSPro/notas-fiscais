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

  it("parseia NFC-e com status de emissão != 'EMISSÃO NORMAL' (ex.: contingência)", () => {
    // Mesma nota do fixture, mas emitida em contingência: o bloco de cabeçalho
    // começa com "EMITIDA EM CONTINGÊNCIA" e usa "Emissão:" em vez de "Data de Emissão:".
    const contingencia = html
      .replace(/EMISSÃO NORMAL/i, "EMITIDA EM CONTINGÊNCIA")
      .replace(/Data de Emissão/i, "Emissão");
    const nota = parseNfceHtml(contingencia);
    expect(nota.numero).toBeTruthy();
    expect(nota.data_emissao).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(nota.itens.length).toBeGreaterThan(0);
  });
});
