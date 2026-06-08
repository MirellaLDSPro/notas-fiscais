# TASKS — Ideias de Feature (Painel NFC-e)

Backlog de **ideias de feature** para o painel de compras, alinhado ao
`REQUISITOS.md`. Não cobre a implementação base do app (RF01–RF12); foca nas
propostas de evolução. Cada item referencia os requisitos existentes que toca.

---

## 1. Comparador de preço por período ⭐ (ideia principal)

**Objetivo:** identificar em que períodos (mês, época do ano, dia da semana)
cada produto fica mais barato, para indicar a melhor janela de compra. Em certas
datas há promoções — quero saber qual período é o ideal para comprar cada item.

**Como se encaixa no spec atual:**
- Estende o RF05 (top produtos já prevê "evolução de preço unitário"); aqui o
  recorte passa a ser temporal, não só a série bruta.
- Lê de `itens` (`produto`, `vu`, `vt`) cruzado com `notas.data_emissao` — não
  precisa de tabela nova.
- Visualização com `recharts` (já na stack, RNF06 mobile-first).

**Escopo proposto:**
- Para cada produto recorrente, agrupar `vu` por mês / estação / dia da semana.
- Marcar os pontos de menor preço como "janelas de promoção".
- Sugerir período ideal por produto (ex.: "OVO GALINHAS LIVRE mais barato em fev").
- Cortes: por mês, por estação, por dia da semana da `data_emissao`.

**Dependências e cuidados:**
- Precisa de histórico suficiente do mesmo produto em datas distintas.
- Hortifrúti tem forte variação sazonal — separar do resto na leitura.
- Usar `codigo` (AR...) e não só `produto` para evitar falsos positivos de
  variação — ver item 2 (casa com a restrição da seção 6 do spec sobre
  reconciliação heurística de produto).

---

## Backlog (ideias futuras / a detalhar)

### 2. Desempate de produto pelo código (AR...)
Agrupar por `itens.codigo` em vez de `itens.produto` para evitar falsos
positivos (ex.: POLPA NORTE com 5 sabores e mesmo nome marcando +165%).
Mitiga a limitação reconhecida na seção 6 (reconciliação heurística). Beneficia
RF05 e o item 1.

### 3. Gasto por categoria
Agregar gasto por categoria usando `produto_categorias` (modelo de dados, seção
5) e o dicionário de `lib/categorizar.ts`. Conecta com RF06 (lista por
categoria) e RF04 (KPIs).

### 4. Preço por quilo nos itens a peso
Para itens com `un = KG`, normalizar e comparar R$/kg ao longo do tempo.
Complementa o item 1 para carnes, frios e hortifrúti.

### 5. Inflação pessoal da cesta
Índice da variação de preço da cesta recorrente entre as compras, sobre os
produtos presentes em 2+ notas (mesma base do RF06).

### 6. Alerta de preço acima da média
Sinalizar quando um produto está acima do seu preço médio histórico. O cálculo
de `preco_medio` já existe (`getListaCompras` em `lib/db.ts` e exibição em
`app/lista-compras/Checklist.tsx`); o que falta é transformar esse valor em
sinalização visual — comparar a última `vu` observada com a média e marcar
quando estiver acima de um threshold. Sem dependência forte do item 1.

---

_Atualizado em 08/06/2026. Referência: REQUISITOS.md (RF/RNF, seções 5 e 6)._