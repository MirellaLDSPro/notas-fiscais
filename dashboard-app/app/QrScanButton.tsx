"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

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

const NFCE_URL_RE = /^https?:\/\/[^/]*(fazenda|sefaz)[^/]*\.gov\.br/i;

export default function QrScanButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    setError(null);
    setStarting(true);

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const url = result.data.trim();
        if (NFCE_URL_RE.test(url)) {
          scanner.stop();
          window.open(url, "_blank", "noopener,noreferrer");
          setOpen(false);
        } else {
          setError(`QR não parece ser de NFC-e. Conteúdo: ${url.slice(0, 60)}${url.length > 60 ? "…" : ""}`);
        }
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: "environment",
      }
    );
    scannerRef.current = scanner;

    scanner
      .start()
      .then(() => setStarting(false))
      .catch((e: unknown) => {
        setStarting(false);
        setError(
          e instanceof Error
            ? `Não foi possível acessar a câmera: ${e.message}`
            : "Não foi possível acessar a câmera."
        );
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: C.panel2,
          color: C.ink,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span aria-hidden style={{ fontSize: 16 }}>📷</span>
        Escanear QR Code da nota
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            backdropFilter: "blur(4px)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 16,
              width: "100%",
              maxWidth: 460,
              overflow: "hidden",
              color: C.ink,
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: `1px solid ${C.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
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
                  }}
                >
                  Leitor de QR Code
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                  Aponte a câmera para o QR code da nota
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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

            <div
              style={{
                position: "relative",
                background: "#000",
                aspectRatio: "1 / 1",
                width: "100%",
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {starting && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.ink,
                    fontSize: 13,
                    background: "rgba(0,0,0,.5)",
                  }}
                >
                  Iniciando câmera…
                </div>
              )}
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  background: C.panel2,
                  borderTop: `1px solid ${C.line}`,
                  color: C.warn,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                padding: "10px 16px",
                fontSize: 11,
                color: C.muted,
                fontFamily: "monospace",
                borderTop: `1px solid ${C.line}`,
              }}
            >
              Ao detectar, a página da Fazenda abre em uma nova aba.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
