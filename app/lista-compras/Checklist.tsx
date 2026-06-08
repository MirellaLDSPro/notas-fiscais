"use client";

import { useEffect, useState } from "react";
import type { ListaCompraItem } from "@/lib/db";

const C = {
  bg: "#0d0f0e",
  panel: "#161a18",
  panel2: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
  accent2: "#5fb89a",
};

const STORAGE_KEY = "lista-compras:checked-v1";

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Checklist({ items }: { items: ListaCompraItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChecked(loadChecked());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // localStorage indisponível (private mode?) — ignora silenciosamente
    }
  }, [checked, hydrated]);

  function toggle(categoria: string) {
    setChecked((prev) => ({ ...prev, [categoria]: !prev[categoria] }));
  }

  function clearAll() {
    setChecked({});
  }

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const totalItems = items.length;

  if (items.length === 0) {
    return (
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          padding: 18,
          color: C.muted,
          fontSize: 14,
        }}
      >
        Ainda não há itens com 2+ ocorrências. Suba mais cupons para começar a ver
        padrões.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, color: C.muted }}>
          {hydrated ? (
            <>
              <span style={{ color: C.accent2, fontWeight: 600 }}>{totalChecked}</span>
              {" / "}
              {totalItems} marcados
            </>
          ) : (
            <>{totalItems} categorias</>
          )}
        </div>
        {hydrated && totalChecked > 0 && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: C.panel2,
              border: `1px solid ${C.line}`,
              color: C.ink,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Limpar marcações
          </button>
        )}
      </div>

      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {items.map((it, idx) => {
          const isChecked = Boolean(checked[it.categoria]);
          const isExpanded = Boolean(expanded[it.categoria]);
          return (
            <div
              key={it.categoria}
              style={{
                borderTop: idx === 0 ? "none" : `1px solid ${C.line}`,
                background: isChecked ? C.panel2 : "transparent",
                transition: "background .15s",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(it.categoria)}
                  style={{
                    width: 20,
                    height: 20,
                    accentColor: C.accent,
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: isChecked ? C.muted : C.ink,
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {it.categoria}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      marginTop: 2,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: C.accent2, fontWeight: 600 }}>
                      {it.vezes}× compras
                    </span>
                    <span>preço médio {fmtBRL(it.preco_medio)}</span>
                    <span>últ. {it.ultima_compra}</span>
                  </div>
                </div>
                {it.produtos.length > 1 && (
                  <button
                    type="button"
                    aria-label={isExpanded ? "Recolher variações" : "Ver variações"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpanded((p) => ({ ...p, [it.categoria]: !p[it.categoria] }));
                    }}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.line}`,
                      color: C.muted,
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                )}
              </label>
              {isExpanded && it.produtos.length > 1 && (
                <div
                  style={{
                    padding: "0 16px 12px 48px",
                    fontSize: 11,
                    color: C.muted,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {it.produtos.map((p) => (
                    <span key={p}>· {p}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
