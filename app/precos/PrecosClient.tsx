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
  ReferenceDot,
} from "recharts";
import type { SeriePrecoProduto } from "@/lib/db";
import SearchableSelect from "../SearchableSelect";

const C = {
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

const card: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: 18,
  marginBottom: 16,
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

const KG_FACTOR: Record<string, number | undefined> = { KG: 1, G: 0.001 };

function unitInfo(s: SeriePrecoProduto): {
  isMass: boolean;
  factor: number;
  unitLabel: string;
} {
  const un = s.un_principal ?? "";
  const norm = un.toUpperCase().trim();
  const factor = KG_FACTOR[norm];
  if (factor) return { isMass: true, factor, unitLabel: "R$/kg" };
  return { isMass: false, factor: 1, unitLabel: s.un_principal ? `R$/${un}` : "R$/un" };
}

export default function PrecosClient({ series }: { series: SeriePrecoProduto[] }) {
  const recorrentes = useMemo(
    () => series.filter((s) => s.n_total >= 2),
    [series]
  );
  const [selKey, setSelKey] = useState<string>(recorrentes[0]?.key ?? "");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (recorrentes.length === 0) {
    return (
      <div
        style={{
          ...card,
          color: C.muted,
          fontSize: 14,
        }}
      >
        Precisa de pelo menos 2 compras do mesmo produto pra comparar preço por
        período. Suba mais cupons.
      </div>
    );
  }

  const cur = recorrentes.find((s) => s.key === selKey) ?? recorrentes[0];
  const unit = unitInfo(cur);
  const fmtPreco = (v: number) =>
    unit.isMass ? `${BRL(v / unit.factor)}/kg` : BRL(v);

  const mensalChart = cur.mensal.map((m) => ({
    label: m.label,
    vu: m.vu_avg,
    ym: m.ym,
  }));

  const minMes = cur.mensal.length
    ? cur.mensal.reduce((b, m) => (m.vu_avg < b.vu_avg ? m : b))
    : null;

  return (
    <>
      <SearchableSelect
        options={recorrentes.map((s) => ({
          key: s.key,
          label: `${s.produto} (${s.n_total}×)`,
        }))}
        value={cur.key}
        onChange={setSelKey}
        placeholder="Buscar produto…"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          margin: "16px 0",
        }}
      >
        {[
          {
            lbl: "Preço médio",
            val: fmtPreco(cur.vu_avg),
            note: `${cur.n_total} compras`,
          },
          {
            lbl: "Mínimo",
            val: fmtPreco(cur.vu_min),
            note: cur.melhor_mes ? `melhor em ${cur.melhor_mes.label}` : "—",
          },
          {
            lbl: "Máximo",
            val: fmtPreco(cur.vu_max),
            note: `variação ${cur.vu_min ? (((cur.vu_max - cur.vu_min) / cur.vu_min) * 100).toFixed(0) : "0"}%`,
          },
          {
            lbl: "Última compra",
            val: fmtPreco(cur.vu_ultimo),
            note: cur.data_ultimo,
          },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              ...card,
              marginBottom: 0,
              padding: 14,
              position: "relative",
              overflow: "hidden",
            }}
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
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: "4px 0 2px",
                letterSpacing: "-.01em",
              }}
            >
              {k.val}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>{k.note}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
          Por mês
        </h3>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>
          {unit.unitLabel} médio por mês de emissão.
          {minMes && cur.mensal.length >= 2
            ? ` Mais barato em ${minMes.label}.`
            : ""}
        </p>
        <div style={{ width: "100%", height: 220 }}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mensalChart}
                margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
              >
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={{ stroke: C.line }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    unit.isMass
                      ? `R$${(v / unit.factor).toFixed(0)}`
                      : `R$${v.toFixed(2)}`
                  }
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<ChartTip fmt={fmtPreco} />} />
                <Line
                  type="monotone"
                  dataKey="vu"
                  stroke={C.accent}
                  strokeWidth={2}
                  dot={{ fill: C.accent, r: 4 }}
                />
                {minMes && cur.mensal.length >= 2 && (
                  <ReferenceDot
                    x={minMes.label}
                    y={minMes.vu_avg}
                    r={7}
                    fill={C.accent2}
                    stroke={C.ink}
                    strokeWidth={1.5}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
          Por dia da semana
        </h3>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>
          Útil pra notar promoções recorrentes (ex.: hortifrúti na quarta).
        </p>
        <div style={{ width: "100%", height: 200 }}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cur.dow}
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={{ stroke: C.line }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="vu_avg"
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    unit.isMass
                      ? `R$${(v / unit.factor).toFixed(0)}`
                      : `R$${v.toFixed(2)}`
                  }
                />
                <Tooltip content={<ChartTip fmt={fmtPreco} />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Bar dataKey="vu_avg" fill={C.accent2} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
