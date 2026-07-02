import type { ListaCompraItem } from "./db";

// Estimativa do total da lista: soma o preço médio de cada categoria,
// assumindo 1 unidade de cada. Arredonda em centavos para evitar artefatos
// de ponto flutuante (ex.: 0.1 + 0.2 = 0.30000000000000004).
export function previstoTotal(items: ListaCompraItem[]): number {
  const soma = items.reduce((s, it) => s + it.preco_medio, 0);
  return Math.round(soma * 100) / 100;
}
