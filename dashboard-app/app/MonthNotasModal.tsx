"use client";

import { useEffect, useMemo } from "react";
import type { NotaPayload } from "./Dashboard";

const C = {
  panel: "#161a18",
  panel2: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
  accent2: "#5fb89a",
};

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseD = (s: string) => {
  const [d, m, y] = s.split("/");
  return new Date(+y, +m - 1, +d);
};

const monthLabel = (key: string) => {
  const [mm, yyyy] = key.split("/");
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[+mm - 1] ?? mm} de ${yyyy}`;
};

export default function MonthNotasModal({
  monthKey,
  notas,
  onClose,
}: {
  monthKey: string;
  notas: NotaPayload[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const [mm, yyyy] = monthKey.split("/");
    return notas
      .filter((n) => {
        const [, m, y] = n.data_emissao.split("/");
        return m === mm && y === yyyy;
      })
      .sort((a, b) => parseD(a.data_emissao).getTime() - parseD(b.data_emissao).getTime());
  }, [monthKey, notas]);

  const total = filtered.reduce((s, n) => s + n.valor_total, 0);
  const creditos = filtered.reduce((s, n) => s + n.creditos, 0);

  const fonteColor = (f: string) =>
    f === "PDF" ? C.accent : f === "XLSX" ? C.accent2 : C.muted;

  const td: React.CSSProperties = {
    padding: "10px",
    borderBottom: `1px solid ${C.line}`,
    fontSize: 13,
  };
  const numTd: React.CSSProperties = {
    ...td,
    textAlign: "right",
    fontFamily: "monospace",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 12px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 720,
          color: C.ink,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: C.accent,
                marginBottom: 6,
              }}
            >
              Mês selecionado
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: "0 0 4px",
                letterSpacing: "-.01em",
              }}
            >
              {monthLabel(monthKey)}
            </h2>
            <div style={{ fontSize: 12, color: C.muted }}>
              {filtered.length} nota{filtered.length === 1 ? "" : "s"} · total {BRL(total)}
              {creditos > 0 ? ` · créditos NFP ${BRL(creditos)}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: C.panel2,
              border: `1px solid ${C.line}`,
              color: C.ink,
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 13 }}>
              Nenhuma nota encontrada nesse mês.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Data", "Nota", "Emitente", "Itens", "Fonte", "Valor"].map((l, idx) => (
                    <th
                      key={l}
                      style={{
                        textAlign: idx === 3 || idx === 5 ? "right" : "left",
                        fontSize: 10,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        color: C.muted,
                        padding: "10px",
                        borderBottom: `1px solid ${C.line}`,
                        fontFamily: "monospace",
                        background: C.panel,
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id}>
                    <td style={td}>{n.data_emissao}</td>
                    <td style={{ ...td, fontFamily: "monospace" }}>#{n.numero}</td>
                    <td style={td}>{n.emitente}</td>
                    <td style={numTd}>{n.itens.length || "—"}</td>
                    <td
                      style={{
                        ...td,
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: fonteColor(n.fonte),
                      }}
                    >
                      {n.fonte}
                    </td>
                    <td style={numTd}>{BRL(n.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
