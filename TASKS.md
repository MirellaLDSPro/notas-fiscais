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

### 7. QR Scan → upload direto via IA
O `QrScanButton` hoje só redireciona pro portal da Fazenda. O **OCR de foto
via Claude já está implementado** (`lib/ocrNfce.ts → parseNfceViaClaude`,
usado no fallback de upload PDF). Falta canalizar o frame da câmera (ou foto
tirada) pelo mesmo pipeline em vez de só abrir o portal — usuário aponta a
câmera, foto vira PDF (ou imagem direta), o backend chama Claude e a nota
entra com `fonte='CLAUDE'`.

---

## Concluído

- **Fallback de parse de NFC-e via IA** (`lib/ocrNfce.ts`, RF19). Quando o
  parser regex de PDF falha (foto em PDF, layout não suportado), o backend
  chama Claude Haiku 4.5 pra extrair todos os campos. Sucesso vira nota
  normal com `fonte='CLAUDE'`; falha registra em `notas_erros`.
- **Painel `/admin/erros`** (RF20). Lista notas parseadas por IA + falhas
  totais com dados parciais, dedup por usuário.

---

_Atualizado em 09/06/2026. Referência: REQUISITOS.md (RF/RNF, seções 5 e 6)._