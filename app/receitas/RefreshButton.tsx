"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const C = {
  panel: "#161a18",
  panel2: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  accent: "#d4ff4f",
};

export default function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/recipes?force=1", { cache: "no-store" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        background: C.panel2,
        color: busy ? "#666" : C.ink,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: busy ? "wait" : "pointer",
      }}
    >
      {busy ? "Gerando…" : "Gerar novas receitas"}
    </button>
  );
}
