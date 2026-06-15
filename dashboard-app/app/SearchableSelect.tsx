"use client";

import { useEffect, useRef, useState } from "react";

const C = {
  panel: "#161a18",
  panel2: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
};

export type SearchableOption = { key: string; label: string };

type Props = {
  options: SearchableOption[];
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar produto…",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.key === value)?.label ?? "";

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  const commit = (key: string) => {
    onChange(key);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        type="search"
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && filtered[active]) {
            e.preventDefault();
            commit(filtered[active].key);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        style={{
          background: C.panel2,
          border: `1px solid ${open ? C.accent : C.line}`,
          color: C.ink,
          padding: "9px 12px",
          borderRadius: 9,
          fontSize: 14,
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 9,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "0 10px 24px rgba(0,0,0,.4)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 14px", color: C.muted, fontSize: 13 }}>
              Nada encontrado.
            </div>
          ) : (
            filtered.map((o, i) => {
              const isSelected = o.key === value;
              const isActive = i === active;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(o.key);
                  }}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: isActive ? C.panel2 : "transparent",
                    border: "none",
                    borderBottom: `1px solid ${C.line}`,
                    color: isSelected ? C.accent : C.ink,
                    padding: "10px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {o.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
