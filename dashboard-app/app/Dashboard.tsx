"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import UploadDropzone from "./UploadDropzone";
import { TutorialVideoInline } from "./TutorialVideo";
import ViewingAsBanner from "./ViewingAsBanner";

type ViewingAs = {
  ownerUserId: number;
  email: string;
  name: string | null;
};
import MonthNotasModal from "./MonthNotasModal";
import SearchableSelect from "./SearchableSelect";
import type { GastoCategoria, InflacaoCesta } from "@/lib/db";

export type NotaPayload = {
  id: number;
  numero: string;
  serie: string | null;
  data_emissao: string;
  emitente: string;
  cnpj: string | null;
  valor_total: number;
  chave_acesso: string | null;
  creditos: number;
  situacao_credito: string | null;
  fonte: string;
  itens: Array<{
    id: number;
    produto: string;
    codigo: string | null;
    qt: number;
    un: string | null;
    vu: number;
    vt: number;
  }>;
};

type FlatRow = {
  data: string;
  prod: string;
  codigo: string | null;
  qt: number;
  un: string | null;
  vu: number;
  vt: number;
  nota: string;
  emitente: string;
};

const groupKey = (codigo: string | null, prod: string): string =>
  codigo && codigo.trim() ? `c:${codigo.trim()}` : `p:${prod}`;

const C = {
  bg: "#0d0f0e",
  panel: "#161a18",
  panel2: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
  accent2: "#5fb89a",
  warn: "#ff7a59",
};

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const NUM = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const parseD = (s: string) => {
  const [d, m, y] = s.split("/");
  return new Date(+y, +m - 1, +d);
};

type ChartTipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  fmt: (v: number) => string;
};
const ChartTip = ({ active, payload, fmt }: ChartTipProps) =>
  active && payload && payload.length ? (
    <div
      style={{
        background: C.panel2,
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        color: C.ink,
      }}
    >
      {fmt(payload[0].value)}
    </div>
  ) : null;

const MES_NAME = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const ymToLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MES_NAME[+m - 1]}/${y.slice(2)}`;
};

export default function Dashboard({
  notas,
  gastoCategoria,
  inflacao,
  readOnly = false,
  viewingAs = null,
}: {
  notas: NotaPayload[];
  gastoCategoria: GastoCategoria[];
  inflacao: InflacaoCesta | null;
  readOnly?: boolean;
  viewingAs?: ViewingAs | null;
}) {
  const data: FlatRow[] = useMemo(
    () =>
      notas.flatMap((n) =>
        n.itens.map((i) => ({
          data: n.data_emissao,
          prod: i.produto,
          codigo: i.codigo,
          qt: i.qt,
          un: i.un,
          vu: i.vu,
          vt: i.vt,
          nota: n.numero,
          emitente: n.emitente,
        }))
      ),
    [notas]
  );

  const notasSummary = useMemo(
    () =>
      notas
        .map((n) => ({
          nota: n.numero,
          data: n.data_emissao,
          emitente: n.emitente,
          total: n.valor_total,
          itens: n.itens.length,
          fonte: n.fonte,
        }))
        .sort((a, b) => parseD(a.data).getTime() - parseD(b.data).getTime()),
    [notas]
  );

  const comp = useMemo(() => {
    type Bucket = {
      key: string;
      vus: number[];
      vt: number;
      nameCounts: Map<string, number>;
    };
    const m = new Map<string, Bucket>();
    for (const r of data) {
      const k = groupKey(r.codigo, r.prod);
      let cur = m.get(k);
      if (!cur) {
        cur = { key: k, vus: [], vt: 0, nameCounts: new Map() };
        m.set(k, cur);
      }
      cur.vus.push(r.vu);
      cur.vt += r.vt;
      cur.nameCounts.set(r.prod, (cur.nameCounts.get(r.prod) ?? 0) + 1);
    }
    return [...m.values()].map((p) => {
      const min = Math.min(...p.vus);
      const max = Math.max(...p.vus);
      const avg = p.vus.reduce((a, b) => a + b, 0) / p.vus.length;
      const prod = [...p.nameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return {
        key: p.key,
        prod,
        min,
        max,
        avg,
        n: p.vus.length,
        vt: p.vt,
        varp: min ? (max - min) / min : 0,
        varAbs: max - min,
      };
    });
  }, [data]);

  const totalGasto = useMemo(
    () => notas.reduce((a, n) => a + n.valor_total, 0),
    [notas]
  );
  const maisCaro = useMemo(() => [...comp].sort((a, b) => b.vt - a.vt)[0], [comp]);
  const repItems = useMemo(
    () =>
      comp
        .filter((c) => c.n > 1)
        .map((c) => ({ key: c.key, prod: c.prod }))
        .sort((a, b) => a.prod.localeCompare(b.prod)),
    [comp]
  );

  const creditosBySituacao = useMemo(() => {
    const m = new Map<string, number>();
    let total = 0;
    for (const n of notas) {
      if (n.creditos > 0 && n.situacao_credito) {
        m.set(n.situacao_credito, (m.get(n.situacao_credito) ?? 0) + n.creditos);
        total += n.creditos;
      }
    }
    return { porSituacao: [...m.entries()].sort((a, b) => b[1] - a[1]), total };
  }, [notas]);

  const [chartView, setChartView] = useState<"compra" | "mes">("compra");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const monthlyData = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notas) {
      const [, mm, yyyy] = n.data_emissao.split("/");
      if (!mm || !yyyy) continue;
      const key = `${yyyy}-${mm}`;
      m.set(key, (m.get(key) ?? 0) + n.valor_total);
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [y, mo] = key.split("-");
        return { name: `${mo}/${y}`, total };
      });
  }, [notas]);

  const [compFiltro, setCompFiltro] = useState("rep");
  const [compBusca, setCompBusca] = useState("");
  const [compSort, setCompSort] = useState<{ k: keyof (typeof comp)[number]; dir: 1 | -1 }>({
    k: "varp",
    dir: -1,
  });
  const [notaFiltro, setNotaFiltro] = useState<string>("all");
  const [itemBusca, setItemBusca] = useState("");
  const [evoProd, setEvoProd] = useState<string>("");

  const evoProdActual = evoProd || repItems[0]?.key || "";

  if (data.length === 0) {
    return (
      <div
        style={{
          background: C.bg,
          color: C.ink,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          padding: "20px 14px 60px",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: C.accent,
              marginBottom: 10,
            }}
          >
            Painel de Compras · NFC-e
          </div>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-.02em",
              margin: "0 0 8px",
            }}
          >
            Comece enviando um <em style={{ color: C.accent2 }}>cupom fiscal</em>.
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px" }}>
            {readOnly
              ? "Este relatório ainda não tem cupons enviados."
              : "Os PDFs da NFC-e (igual aos da Fazenda SP) vão alimentar o painel."}
          </p>
          {!readOnly && <TutorialVideoInline />}
          {!readOnly && <UploadDropzone />}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      lbl: "Total gasto",
      val: BRL(totalGasto),
      note: `${notas.length} notas · ${data.length} itens`,
    },
    {
      lbl: "Ticket médio",
      val: BRL(totalGasto / Math.max(notas.length, 1)),
      note: "por nota fiscal",
    },
    {
      lbl: "Produtos distintos",
      val: String(comp.length),
      note: `${repItems.length} comprados +1 vez`,
    },
    {
      lbl: "Item que mais pesou",
      val: maisCaro ? BRL(maisCaro.vt) : "—",
      note: maisCaro?.prod ?? "",
    },
  ];

  const topData = [...comp]
    .sort((a, b) => b.vt - a.vt)
    .slice(0, 8)
    .map((t) => ({
      name: t.prod.length > 16 ? t.prod.slice(0, 15) + "…" : t.prod,
      vt: t.vt,
    }));

  const notasData = notasSummary.map((n) => ({ name: n.data, total: n.total }));

  const evoData = data
    .filter((r) => groupKey(r.codigo, r.prod) === evoProdActual)
    .sort((a, b) => parseD(a.data).getTime() - parseD(b.data).getTime())
    .map((r) => ({ data: r.data, vu: r.vu }));

  const compRows = (() => {
    const rows = comp.filter(
      (c) =>
        (compFiltro === "all" || c.n > 1) &&
        c.prod.toLowerCase().includes(compBusca.toLowerCase())
    );
    rows.sort((a, b) => {
      const x = a[compSort.k];
      const y = b[compSort.k];
      if (typeof x === "string" && typeof y === "string")
        return x.localeCompare(y) * compSort.dir;
      return ((x as number) - (y as number)) * compSort.dir;
    });
    return rows;
  })();

  const itemRows = data.filter(
    (r) =>
      (notaFiltro === "all" || r.nota === notaFiltro) &&
      r.prod.toLowerCase().includes(itemBusca.toLowerCase())
  );

  const card: React.CSSProperties = {
    background: C.panel,
    border: `1px solid ${C.line}`,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  };
  const sel: React.CSSProperties = {
    background: C.panel2,
    border: `1px solid ${C.line}`,
    color: C.ink,
    padding: "9px 12px",
    borderRadius: 9,
    fontSize: 14,
    outline: "none",
    width: "100%",
    marginBottom: 8,
  };
  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 10,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: C.muted,
    padding: "10px 10px",
    borderBottom: `1px solid ${C.line}`,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "monospace",
  };
  const td: React.CSSProperties = {
    padding: "10px 10px",
    borderBottom: `1px solid ${C.line}`,
    fontSize: 13,
  };
  const numTd: React.CSSProperties = { ...td, textAlign: "right", fontFamily: "monospace" };

  return (
    <div
      style={{
        background: C.bg,
        color: C.ink,
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        padding: "20px 14px 60px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: C.accent,
            marginBottom: 10,
          }}
        >
          Painel de Compras · NFC-e
        </div>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-.02em",
            margin: "0 0 8px",
          }}
        >
          Onde foi <em style={{ color: C.accent2 }}>seu</em> dinheiro.
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px" }}>
          {readOnly
            ? "Base consolidada dos cupons deste relatório."
            : "Base consolidada dos seus cupons fiscais."}
        </p>

        {viewingAs && <ViewingAsBanner viewingAs={viewingAs} exitHref="/dashboard" />}

        {!readOnly && <UploadDropzone />}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {kpis.map((k, i) => (
            <div
              key={i}
              style={{ ...card, marginBottom: 0, padding: 16, position: "relative", overflow: "hidden" }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 3,
                  height: "100%",
                  background: C.accent,
                }}
              />
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: C.muted,
                }}
              >
                {k.lbl}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px", letterSpacing: "-.01em" }}>
                {k.val}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>{k.note}</div>
            </div>
          ))}
        </div>

        {inflacao && (
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
              Inflação da sua cesta
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>
              Variação média de preço dos {inflacao.n_produtos} produtos com histórico,
              entre {ymToLabel(inflacao.primeiro_mes)} e {ymToLabel(inflacao.ultimo_mes)}.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: inflacao.variacao_pct >= 0 ? C.warn : C.accent2,
                  letterSpacing: "-.02em",
                }}
              >
                {inflacao.variacao_pct >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(inflacao.variacao_pct).toFixed(1)}%
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>
                {inflacao.variacao_pct >= 0 ? "mais cara" : "mais barata"} no período
              </span>
            </div>
          </div>
        )}

        {creditosBySituacao.total > 0 && (
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
              Créditos NFP (Nota Fiscal Paulista)
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>
              Acumulado por situação do crédito.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(creditosBySituacao.porSituacao.length + 1, 4)}, 1fr)`,
                gap: 10,
              }}
            >
              <div
                style={{
                  background: C.panel2,
                  border: `1px solid ${C.line}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.muted,
                  }}
                >
                  Total
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.accent,
                    marginTop: 4,
                  }}
                >
                  {BRL(creditosBySituacao.total)}
                </div>
              </div>
              {creditosBySituacao.porSituacao.map(([sit, val]) => (
                <div
                  key={sit}
                  style={{
                    background: C.panel2,
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      color: C.muted,
                    }}
                  >
                    {sit}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{BRL(val)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
                {chartView === "compra" ? "Gasto por compra" : "Gasto mensal"}
              </h3>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                {chartView === "compra"
                  ? "Total de cada nota, por data."
                  : "Total acumulado por mês de emissão. Clique numa barra para ver as notas."}
              </p>
            </div>
            <select
              value={chartView}
              onChange={(e) => setChartView(e.target.value as "compra" | "mes")}
              style={{ ...sel, width: "auto", marginBottom: 0, fontSize: 12, padding: "6px 10px" }}
            >
              <option value="compra">Por compra</option>
              <option value="mes">Por mês</option>
            </select>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartView === "compra" ? notasData : monthlyData}
              margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
            >
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: C.muted, fontSize: 11 }}
                axisLine={{ stroke: C.line }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => "R$" + v}
              />
              <Tooltip content={<ChartTip fmt={BRL} />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <Bar
                dataKey="total"
                fill={C.accent}
                radius={[6, 6, 0, 0]}
                cursor={chartView === "mes" ? "pointer" : "default"}
                onClick={(d: { name?: string }) => {
                  if (chartView === "mes" && d?.name) setSelectedMonth(d.name);
                }}
              />
            </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>Onde o dinheiro foi</h3>
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>
            Top 8 produtos por valor total.
          </p>
          <div style={{ width: "100%", height: 300 }}>
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={C.line} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: C.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => "R$" + v}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: C.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={108}
              />
              <Tooltip content={<ChartTip fmt={BRL} />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <Bar dataKey="vt" fill={C.accent2} radius={[0, 6, 6, 0]} />
            </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {gastoCategoria.length > 0 && (
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
              Gasto por categoria
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>
              Top 10 categorias por gasto acumulado.
            </p>
            <div style={{ width: "100%", height: 300 }}>
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gastoCategoria.slice(0, 10).map((g) => ({
                      name:
                        g.categoria.length > 14
                          ? g.categoria.slice(0, 13) + "…"
                          : g.categoria,
                      total: g.total,
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke={C.line} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: C.muted, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => "R$" + v}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={108}
                    />
                    <Tooltip
                      content={<ChartTip fmt={BRL} />}
                      cursor={{ fill: "rgba(255,255,255,.04)" }}
                    />
                    <Bar dataKey="total" fill={C.accent} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {repItems.length > 0 && (
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>Evolução de preço</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>
              Preço unitário do mesmo item em datas diferentes.
            </p>
            <div style={{ marginBottom: 8 }}>
              <SearchableSelect
                options={repItems.map((p) => ({ key: p.key, label: p.prod }))}
                value={evoProdActual}
                onChange={setEvoProd}
                placeholder="Buscar produto…"
              />
            </div>
            <div style={{ width: "100%", height: 240 }}>
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evoData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis
                  dataKey="data"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={{ stroke: C.line }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => "R$" + v}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<ChartTip fmt={BRL} />} />
                <Line
                  type="monotone"
                  dataKey="vu"
                  stroke={C.accent}
                  strokeWidth={2}
                  dot={{ fill: C.accent, r: 5 }}
                />
              </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "30px 0 14px" }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: C.accent, marginRight: 8 }}>
            01
          </span>
          Comparação de preços
        </h2>
        <div style={card}>
          <select style={sel} value={compFiltro} onChange={(e) => setCompFiltro(e.target.value)}>
            <option value="rep">Só itens comprados mais de uma vez</option>
            <option value="all">Todos os produtos</option>
          </select>
          <input
            style={sel}
            type="search"
            placeholder="Buscar produto…"
            value={compBusca}
            onChange={(e) => setCompBusca(e.target.value)}
          />
          <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead>
                <tr>
                  {(
                    [
                      ["prod", "Produto"],
                      ["min", "Mín"],
                      ["max", "Máx"],
                      ["avg", "Médio"],
                      ["varp", "Variação"],
                      ["n", "×"],
                    ] as const
                  ).map(([k, l]) => (
                    <th
                      key={k}
                      style={th}
                      onClick={() =>
                        setCompSort((s) => ({
                          k: k as keyof (typeof comp)[number],
                          dir: s.k === k ? ((-s.dir) as 1 | -1) : -1,
                        }))
                      }
                    >
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compRows.map((c, i) => (
                  <tr key={i}>
                    <td style={td}>{c.prod}</td>
                    <td style={numTd}>{BRL(c.min)}</td>
                    <td style={numTd}>{BRL(c.max)}</td>
                    <td style={numTd}>{BRL(c.avg)}</td>
                    <td style={{ ...numTd, color: c.varAbs > 0.001 ? C.warn : C.muted }}>
                      {c.varAbs > 0.001 ? "▲ " : "• "}
                      {(c.varp * 100).toFixed(1)}%
                    </td>
                    <td style={numTd}>{c.n}</td>
                  </tr>
                ))}
                {compRows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: "center", color: C.muted, padding: 24 }}>
                      Nenhum produto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "30px 0 14px" }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: C.accent, marginRight: 8 }}>
            02
          </span>
          Detalhe item a item
        </h2>
        <div style={card}>
          <select style={sel} value={notaFiltro} onChange={(e) => setNotaFiltro(e.target.value)}>
            <option value="all">Todas as notas</option>
            {notasSummary.map((n) => (
              <option key={n.nota} value={n.nota}>
                {n.data} · #{n.nota} · [{n.fonte}] · {n.emitente}
              </option>
            ))}
          </select>
          <input
            style={sel}
            type="search"
            placeholder="Buscar produto…"
            value={itemBusca}
            onChange={(e) => setItemBusca(e.target.value)}
          />
          <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
              <thead>
                <tr>
                  {["Data", "Produto", "Qtde", "Un", "Vl.Unit.", "Vl.Total"].map((l) => (
                    <th key={l} style={th}>
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemRows.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{r.data}</td>
                    <td style={td}>{r.prod}</td>
                    <td style={numTd}>{NUM(r.qt)}</td>
                    <td style={td}>{r.un}</td>
                    <td style={numTd}>{BRL(r.vu)}</td>
                    <td style={numTd}>{BRL(r.vt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p
          style={{
            color: C.muted,
            fontSize: 11,
            textAlign: "center",
            marginTop: 24,
            fontFamily: "monospace",
          }}
        >
          {notasSummary.length} notas · {data.length} itens · NFC-e
        </p>
      </div>

      {selectedMonth && (
        <MonthNotasModal
          monthKey={selectedMonth}
          notas={notas}
          onClose={() => setSelectedMonth(null)}
        />
      )}
    </div>
  );
}
