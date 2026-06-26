import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseNfceXml, looksLikeNfeXml } from "@/lib/parseNfceXml";

const xml = readFileSync(resolve(__dirname, "fixtures/nfce-pe.xml"), "utf8");

describe("parseNfceXml", () => {
  it("detecta XML da NFe e rejeita HTML", () => {
    expect(looksLikeNfeXml(xml)).toBe(true);
    expect(looksLikeNfeXml("<!DOCTYPE html><html><body>x</body></html>")).toBe(false);
    expect(looksLikeNfeXml('<?xml version="1.0"?><rss><channel/></rss>')).toBe(false);
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

  it("lança em XML sem nNF/dhEmi", () => {
    const semIde = '<nfeProc><NFe><infNFe Id="NFe' + "2".repeat(44) + '"><ide></ide></infNFe></NFe></nfeProc>';
    expect(() => parseNfceXml(semIde)).toThrow();
  });
});
