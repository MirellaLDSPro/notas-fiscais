"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function TransferNotaModal({ notaId, ownerEmail } : { notaId: number; ownerEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const targetEmail = (email || "").trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Email destino inválido");
      return;
    }
    // validate notaId on client to avoid sending bad requests
    const nid = Number(notaId);
    if (!Number.isFinite(nid) || nid <= 0) {
      setError("nota id inválido (cliente)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notas/${nid}/transfer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserEmail: targetEmail, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erro ao transferir");
        setLoading(false);
        return;
      }
      setOpen(false);
      setEmail("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid rgba(0,0,0,0.1)",
          background: "transparent",
          color: "#d4ff4f",
          cursor: "pointer",
          fontSize: 12,
        }}
        title={`Transferir nota ${notaId} (atualmente: ${ownerEmail})`}
      >
        Transferir
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setOpen(false)} />
          <form onSubmit={submit} style={{ position: "relative", background: "#0d0f0e", padding: 18, borderRadius: 12, minWidth: 360, border: "1px solid #2a312d" }}>
            <h3 style={{ margin: 0, marginBottom: 8, color: "#eef1ee" }}>Transferir nota #{notaId}</h3>
            <div style={{ color: "#8a9690", fontSize: 12, marginBottom: 10 }}>
              Atualmente: {ownerEmail}
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, color: "#8a9690", marginBottom: 6 }}>Email do usuário destino</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="destino@exemplo.com" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #2a312d", background: "#121412", color: "#eef1ee" }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, color: "#8a9690", marginBottom: 6 }}>Motivo (opcional)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da transferência" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #2a312d", background: "#121412", color: "#eef1ee" }} />
            </div>
            {error && <div style={{ color: "#ff7a59", marginBottom: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOpen(false)} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", color: "#8a9690", border: "1px solid #2a312d" }}>Cancelar</button>
              <button type="submit" disabled={loading} style={{ padding: "6px 10px", borderRadius: 6, background: "#d4ff4f", color: "#000", border: "none" }}>{loading ? "Enviando..." : "Transferir"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
