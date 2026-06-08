"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const C = {
  bg: "#0d0f0e",
  panel: "#161a18",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
};

type Props = {
  src: string;
  alt: string;
  url?: string;
};

export default function LandingScreenshot({ src, alt, url }: Props) {
  const [open, setOpen] = useState(false);

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
        aria-label="Expandir screenshot do painel"
        style={{
          position: "relative",
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          padding: 12,
          cursor: "zoom-in",
          width: "100%",
          textAlign: "left",
          boxShadow: "0 16px 40px rgba(0,0,0,.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28c840" }} />
          <span
            style={{
              marginLeft: 10,
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 10,
              color: C.muted,
            }}
          >
            {url ?? "painel-nfce.app/dashboard"}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 10,
              letterSpacing: ".15em",
              textTransform: "uppercase",
              color: C.accent,
              padding: "4px 8px",
              border: `1px solid ${C.line}`,
              borderRadius: 6,
            }}
          >
            Expandir
          </span>
        </div>
        <div
          style={{
            position: "relative",
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${C.line}`,
            background: C.bg,
            aspectRatio: "16 / 7",
          }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 900px"
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
        </div>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot ampliado do painel"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.82)",
            backdropFilter: "blur(6px)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "min(1200px, 96vw)",
              maxHeight: "92vh",
              width: "100%",
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              padding: 12,
              cursor: "default",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 11,
                  color: C.muted,
                }}
              >
                {url ?? "painel-nfce.app/dashboard"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                style={{
                  background: "transparent",
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
                flex: 1,
                minHeight: 0,
                borderRadius: 8,
                overflow: "auto",
                border: `1px solid ${C.line}`,
                background: C.bg,
              }}
            >
              <Image
                src={src}
                alt={alt}
                width={1107}
                height={1140}
                sizes="(max-width: 1200px) 96vw, 1200px"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
