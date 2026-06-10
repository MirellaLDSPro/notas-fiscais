"use client";

import { useEffect, useState } from "react";

// TODO: substituir pelo link do YouTube quando o vídeo estiver pronto.
// Aceita formatos: https://www.youtube.com/watch?v=ID  •  https://youtu.be/ID  •  https://www.youtube.com/embed/ID
export const TUTORIAL_VIDEO_URL = "https://youtube.com/shorts/sFk0WwnfmMA";

const C = {
  panel: "#161a18",
  panel2: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
  accent2: "#5fb89a",
};

const YT_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/;

function youtubeEmbed(url: string): string | null {
  const m = url.match(YT_ID_RE);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
}

function Placeholder({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        background: C.panel2,
        border: `1px dashed ${C.line}`,
        borderRadius: 12,
        padding: compact ? "14px 16px" : "28px 16px",
        textAlign: "center",
        color: C.muted,
        fontSize: 13,
      }}
    >
      <div style={{ color: C.ink, fontWeight: 600, marginBottom: 4 }}>
        Tutorial em vídeo · em breve
      </div>
      <div style={{ fontSize: 12 }}>
        Em instantes você verá aqui um passo a passo de como enviar o cupom fiscal.
      </div>
    </div>
  );
}

function VideoFrame() {
  const embed = youtubeEmbed(TUTORIAL_VIDEO_URL);
  if (!embed) return <Placeholder />;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 320,
        margin: "0 auto",
        aspectRatio: "9 / 16",
        background: "#000",
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${C.line}`,
      }}
    >
      <iframe
        src={embed}
        title="Como enviar um cupom fiscal"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
}

export function TutorialVideoInline() {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
      }}
    >
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
        Como funciona
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>
        Veja o passo a passo em vídeo
      </h3>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>
        1 minuto explicando como baixar o PDF da NFC-e e enviar pelo painel.
      </p>
      <VideoFrame />
    </div>
  );
}

export function TutorialVideoLink() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: 0,
          padding: 0,
          color: C.accent2,
          fontSize: 12,
          textDecoration: "underline",
          textUnderlineOffset: 3,
          cursor: "pointer",
        }}
      >
        ▶ Ver vídeo do passo a passo
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
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
              overflow: "hidden",
              color: C.ink,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${C.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Como enviar um cupom fiscal
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
            <div style={{ padding: 16 }}>
              <VideoFrame />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
