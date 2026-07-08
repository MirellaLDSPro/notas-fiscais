# Design — Entrada manual de nota (plano B quando o QR não rola)

Data: 2026-06-26

## Problema

Hoje a base do Painel de Compras é alimentada por quatro caminhos: upload de
arquivo (PDF/MHT/XLSX/CSV), escanear o QR Code, colar a URL do QR e digitar a
chave de 44 dígitos (SP). Todos dependem, em última instância, de ler o QR ou
de ter o arquivo da nota.

Existem situações em que isso não é possível e a nota fica de fora:

- **QR danificado/ilegível** — a pessoa tem o cupom de papel em mãos, mas o QR
  está apagado/borrado ou a câmera não foca.
- **Busca automática falhou** — o QR até escaneia, mas o portal da Fazenda pede
  captcha, é de UF não suportada ou está fora do ar.
- **Sem câmera (desktop)** — colar URL/chave já existe, mas é um caminho frágil
  quando a pessoa só tem os dados da compra, não o QR.

O denominador comum: **existe uma NFC-e de verdade, mas o caminho QR → busca
automática está bloqueado.** Falta um plano B para registrar a nota mesmo assim.

## Decisões tomadas (brainstorming)

- **Mecanismo:** formulário de entrada manual dos itens, com a foto+OCR como
  acelerador opcional **em uma etapa futura** (ver "Fora do escopo / Fase 2").
  No v1 é só o formulário digitado na mão.
- **Cenários cobertos:** os três acima. A combinação "formulário como alicerce"
  cobre todos; a foto só ajudaria o primeiro.
- **Duplicatas:** salvar mesmo assim (notas manuais não têm chave, então não há
  como deduplicar de forma confiável), marcar a nota como `MANUAL` no painel e
  **garantir que dá para excluir uma nota** — coisa que hoje não existe.
- **Escopo do v1:** formulário manual + exclusão de nota. A foto/OCR fica para
  a Fase 2.
- **Exclusão:** botão no `MonthNotasModal` (onde já se listam as notas do mês).

## Escopo do v1

**Inclui:**
1. Formulário manual de nota (modal) acionado a partir do card de envio.
2. Endpoint para persistir a nota manual.
3. Tipo `Fonte` estendido com `"MANUAL"`.
4. Exclusão de uma nota: função no `db.ts`, endpoint `DELETE` e botão no
   `MonthNotasModal`, com selo visual para notas `MANUAL`.

**Não inclui (Fase 2):** foto do cupom + OCR pré-preenchendo o formulário.

## Fluxo do usuário

No card "Enviar cupom fiscal (NFC-e)" (`UploadDropzone`), abaixo do botão de QR,
entra um terceiro caminho: **"Adicionar manualmente"**. Ele abre um modal com:

- **Cabeçalho:** emitente (texto), data de emissão (DD/MM/AAAA), e — opcionais —
  número da nota e CNPJ.
- **Itens:** lista de linhas, cada uma com produto, quantidade, unidade (opcional)
  e valor unitário. O valor total da linha é calculado (`qt × vu`). Botões para
  adicionar e remover linha.
- **Rodapé:** total da nota calculado (Σ dos itens) e botão **Salvar**.

Ao salvar, a nota entra na base com `fonte = "MANUAL"` e aparece no painel como
qualquer outra. Sem o cupom em mãos ou no desktop, o mesmo formulário é
preenchido inteiro na mão.

## Componentes e mudanças

### Frontend

- **`app/ManualNotaModal.tsx`** (novo) — componente client com o formulário
  descrito acima. Mantém o estado local dos campos e da lista de itens, valida
  (ver "Validação"), faz `POST` e, no sucesso, chama `router.refresh()` e fecha.
  Reaproveita a paleta de cores `C` e o estilo de modal já usado em
  `QrScanButton`/`MonthNotasModal`.
- **`app/UploadDropzone.tsx`** — adicionar o botão "Adicionar manualmente" abaixo
  do `QrScanButton`, abrindo o `ManualNotaModal`. O resultado de sucesso reusa o
  mesmo bloco de `results` já existente (status `ok`, ação `inserted`).
- **`app/MonthNotasModal.tsx`** — adicionar coluna/ação de excluir por linha
  (a linha já tem `n.id`). Como hoje é read-only, passa a usar `useRouter` para
  `router.refresh()` após excluir, com confirmação antes (ex.: `window.confirm`).
  Estender `fonteColor` para dar um tom próprio a `MANUAL`.

### API

- **`POST /api/notas`** — novo método na rota existente `app/api/notas/route.ts`
  (que hoje só tem `GET`). Recebe o formulário em JSON, valida, monta o
  `ParsedNota` e chama `upsertNota`. Responde no mesmo formato que o
  `UploadDropzone` já entende (`{ status: "ok", action, fonte, nota }`).
- **`DELETE /api/notas/[id]/route.ts`** (novo) — autentica, valida o `id` e chama
  `deleteNota(userId, id)`.

### Banco (`lib/db.ts`)

- **`deleteNota(userId, notaId)`** (nova) — `DELETE FROM notas WHERE id = $1 AND
  user_id = $2`. O `WHERE user_id` impede excluir nota de outro usuário; os itens
  somem por `ON DELETE CASCADE` já existente na tabela `itens`.
- **`Fonte`** — incluir `"MANUAL"`. A coluna `fonte` no banco já é `TEXT`, então
  não há migração; é só o tipo TypeScript.

## Modelo de dados — como a nota manual vira `ParsedNota`

O `ParsedNota` exige `numero`, `data_emissao`, `emitente`, `valor_total` e
`itens`. Mapeamento a partir do formulário:

- `numero` — o que a pessoa digitou; se vazio, gerar sintético `MANUAL-<timestamp>`
  (a coluna é `NOT NULL`).
- `serie` — `null`.
- `data_emissao` — campo do formulário (DD/MM/AAAA).
- `emitente` — campo do formulário.
- `cnpj` — campo do formulário ou `null`.
- `chave_acesso` — `null`.
- `valor_total` — Σ de `vt` dos itens.
- `creditos` — `0`; `situacao_credito` — `null`.
- `fonte` — `"MANUAL"`.
- `itens[]` — `{ produto, codigo: null, qt, un, vu, vt }`, com `vt = qt × vu`.

`upsertNota` deduplica por `chave_acesso` **ou** por `(cnpj + numero)`. Com
`chave_acesso` nulo e (no caso comum) `cnpj` nulo, a consulta de duplicata nunca
casa e a nota é sempre inserida — exatamente o comportamento "salvar mesmo assim".
Se a pessoa informar CNPJ e número que coincidam com uma nota já existente, o
`upsertNota` devolve `skipped` (sem duplicar), o que é aceitável.

## Validação / regras

Mínimo para salvar:
- `emitente` não vazio.
- `data_emissao` em formato de data válido (DD/MM/AAAA).
- pelo menos **um** item com `produto` não vazio e `vu >= 0` e `qt > 0`.

Itens com produto vazio são descartados no envio. Números aceitam vírgula ou
ponto como separador decimal (normalizar no cliente antes do `POST`). Validar
também no servidor (não confiar só no cliente).

## Testes

- **Unit (servidor):** dado um payload de formulário, o handler monta o
  `ParsedNota` correto (numero sintético quando ausente, `valor_total` somado,
  `fonte = "MANUAL"`, `chave_acesso = null`) e rejeita payloads inválidos
  (sem emitente, sem item válido, data malformada).
- **Unit (db):** `deleteNota` só apaga a nota do próprio usuário; tentar apagar
  nota de outro usuário não remove nada.
- Seguir o runner Vitest já configurado (`@/` alias).

## Fora do escopo / Fase 2

- **Foto do cupom + OCR pré-preenchendo o formulário.** O `parseNfceViaClaude`
  já existe e devolve dados parciais quando não lê tudo, então a Fase 2 será:
  endpoint `POST /api/notas/ocr-preview` que roda o OCR e **devolve sem salvar**;
  o `ManualNotaModal` ganha um botão "Tirar foto / enviar imagem" que pré-preenche
  os campos para revisão. Ajuste necessário: enviar a imagem como bloco `image`
  (hoje o OCR usa bloco `document`, que só aceita PDF). O endpoint de salvar do
  v1 já serve para essa etapa — por isso ele recebe o formulário, não o arquivo.
- Dedup heurístico (emitente + data + total) — descartado no v1.
- Exigir a chave de 44 dígitos no formulário — descartado no v1.
