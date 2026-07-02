import { describe, it, expect } from "vitest";
import { previstoTotal } from "@/lib/listaCompras";
import type { ListaCompraItem } from "@/lib/db";

function item(preco_medio: number): ListaCompraItem {
  return {
    categoria: "X",
    vezes: 2,
    ultima_compra: "01/06/2026",
    preco_medio,
    vu_ultimo: preco_medio,
    produtos: ["X"],
  };
}

describe("previstoTotal", () => {
  it("soma o preço médio de cada item", () => {
    expect(previstoTotal([item(10), item(5.5)])).toBe(15.5);
  });

  it("lista vazia → 0", () => {
    expect(previstoTotal([])).toBe(0);
  });

  it("arredonda em centavos (sem artefato de float)", () => {
    expect(previstoTotal([item(0.1), item(0.2)])).toBe(0.3);
  });

  it("itens com preço 0 apenas somam 0", () => {
    expect(previstoTotal([item(0), item(12.34)])).toBe(12.34);
  });
});
