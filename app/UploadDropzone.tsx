"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QrScanButton from "./QrScanButton";
import { TutorialVideoLink } from "./TutorialVideo";

type Summary = {
  numero: string;
  emitente: string;
  total: number;
  itens: number;
  action: "inserted" | "skipped";
  fonte: string;
};
type UploadResult = {
  name: string;
  status: "ok" | "error";
  fonte?: string;
  notas?: Summary[];
  error?: string;
};

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

export default function UploadDropzone() {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length || busy) return;
    setBusy(true);
    setResults([]);
    try {
      const form = new FormData();
      for (const f of arr) form.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json()) as { results?: UploadResult[]; error?: string };
      if (data.results) {
        setResults(data.results);
        if (data.results.some((r) => r.status === "ok")) router.refresh();
      } else {
        setResults([{ name: "—", status: "error", error: data.error ?? "Erro." }]);
      }
    } catch (err) {
      setResults([
        { name: "—", status: "error", error: err instanceof Error ? err.message : "Erro." },
      ]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const card: React.CSSProperties = {
    background: C.panel,
    border: `1px solid ${C.line}`,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  };

  return (
    <div style={card}>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
        Enviar cupom fiscal (NFC-e)
      </h3>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px" }}>
        Arraste o PDF da NFC-e (o mesmo formato do site da Fazenda SP) ou clique para escolher.
      </p>
      <div style={{ marginBottom: 14 }}>
        <TutorialVideoLink />
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.length) sendFiles(e.dataTransfer.files);
        }}
        style={{
          display: "block",
          border: `2px dashed ${drag ? C.accent : C.line}`,
          background: drag ? "rgba(212,255,79,.05)" : C.panel2,
          borderRadius: 12,
          padding: "28px 14px",
          textAlign: "center",
          cursor: busy ? "wait" : "pointer",
          transition: "all .15s ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,.xlsx,.xls,.csv"
          multiple
          hidden
          disabled={busy}
          onChange={(e) => e.target.files && sendFiles(e.target.files)}
        />
        <div style={{ fontSize: 14, color: C.ink, marginBottom: 4 }}>
          {busy ? "Processando…" : "Solte aqui ou clique para selecionar"}
        </div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
          PDF (NFC-e) · XLSX (planilha) · CSV (NFP)
        </div>
      </label>

      <QrScanButton />

      {results.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {results.map((r, i) => {
            const inserted = r.notas?.filter((n) => n.action === "inserted") ?? [];
            const skipped = r.notas?.filter((n) => n.action === "skipped") ?? [];
            const allSkipped = inserted.length === 0 && skipped.length > 0;
            const color =
              r.status !== "ok" ? C.warn : allSkipped ? C.muted : C.accent2;
            const tag =
              r.status !== "ok"
                ? "× erro"
                : allSkipped
                  ? `• ${skipped.length} já existia${skipped.length === 1 ? "" : "m"}`
                  : `✓ ${inserted.length} nova${inserted.length === 1 ? "" : "s"}${skipped.length ? ` · ${skipped.length} ignorada${skipped.length === 1 ? "" : "s"}` : ""}`;
            return (
              <div
                key={i}
                style={{
                  background: C.panel2,
                  border: `1px solid ${C.line}`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "monospace", color: C.muted, wordBreak: "break-all" }}>
                    {r.name}
                    {r.fonte ? ` · ${r.fonte}` : ""}
                  </span>
                  <span style={{ color, fontWeight: 600, whiteSpace: "nowrap" }}>{tag}</span>
                </div>
                {inserted.length > 0 && (
                  <div style={{ color: C.ink, marginTop: 4 }}>
                    {inserted.length === 1
                      ? `#${inserted[0].numero} · ${inserted[0].emitente} · ${inserted[0].itens} itens · ${BRL(inserted[0].total)}`
                      : `${inserted.length} notas adicionadas (total ${BRL(inserted.reduce((s, n) => s + n.total, 0))})`}
                  </div>
                )}
                {skipped.length > 0 && (
                  <div style={{ color: C.muted, marginTop: 4 }}>
                    Ignoradas (já carregadas):{" "}
                    {skipped
                      .slice(0, 6)
                      .map((n) => `#${n.numero}`)
                      .join(", ")}
                    {skipped.length > 6 ? ` …+${skipped.length - 6}` : ""}
                  </div>
                )}
                {r.error && <div style={{ color: C.warn, marginTop: 4 }}>{r.error}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
