"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchableSelect from "./SearchableSelect";

const C = {
  panel: "#161a18",
  panel2: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
  accent2: "#5fb89a",
};

type Item = { href: string; label: string; sub: string; ownerAware?: boolean };
const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", sub: "Painel principal de notas e gastos", ownerAware: true },
  { href: "/lista-compras", label: "Lista de compras", sub: "Itens que você compra com frequência", ownerAware: true },
  { href: "/precos", label: "Preços por período", sub: "Quando cada produto fica mais barato", ownerAware: true },
  { href: "/receitas", label: "Receitas", sub: "O que cozinhar com suas últimas compras" },
  { href: "/compartilhar", label: "Compartilhar relatório", sub: "Dar acesso de leitura a outro email" },
  { href: "/contato", label: "Contato", sub: "Falar com a autora do projeto" },
];

type SharedOwner = {
  ownerUserId: number;
  email: string;
  name: string | null;
};

type MenuProps = {
  userEmail: string | null;
  logoutAction: () => Promise<void>;
  sharedWithMe?: SharedOwner[];
};

export default function Menu({ userEmail, logoutAction, sharedWithMe = [] }: MenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewingOwnerId = searchParams.get("owner");
  const viewingOwner = viewingOwnerId
    ? sharedWithMe.find((o) => String(o.ownerUserId) === viewingOwnerId) ?? null
    : null;
  const backToMineHref =
    pathname && ["/dashboard", "/lista-compras", "/precos"].includes(pathname)
      ? pathname
      : "/dashboard";

  const sharedOptions = sharedWithMe.map((o) => ({
    key: String(o.ownerUserId),
    label: o.name?.trim() ? `${o.name.trim()} · ${o.email}` : o.email,
  }));

  const navigateToShared = (ownerKey: string) => {
    setOpen(false);
    const targetPath =
      pathname && ["/dashboard", "/lista-compras", "/precos"].includes(pathname)
        ? pathname
        : "/dashboard";
    router.push(`${targetPath}?owner=${ownerKey}`);
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          zIndex: 30,
          width: 44,
          height: 44,
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          color: C.ink,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: 0,
          boxShadow: "0 4px 16px rgba(0,0,0,.35)",
        }}
      >
        <span
          style={{
            width: 18,
            height: 2,
            background: C.accent,
            borderRadius: 2,
            display: "block",
          }}
        />
        <span
          style={{
            width: 18,
            height: 2,
            background: C.ink,
            borderRadius: 2,
            display: "block",
          }}
        />
        <span
          style={{
            width: 18,
            height: 2,
            background: C.ink,
            borderRadius: 2,
            display: "block",
          }}
        />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(4px)",
            zIndex: 40,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.panel,
              borderLeft: `1px solid ${C.line}`,
              width: "min(320px, 88vw)",
              height: "100%",
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: C.accent,
                }}
              >
                Navegação
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
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

            {viewingOwner && (
              <Link
                href={backToMineHref}
                style={{
                  display: "block",
                  padding: "12px 14px",
                  background: C.panel2,
                  border: `1px solid ${C.line}`,
                  borderLeft: `3px solid ${C.accent}`,
                  borderRadius: 10,
                  color: C.ink,
                  textDecoration: "none",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.accent,
                    marginBottom: 2,
                  }}
                >
                  ← Voltar ao meu relatório
                </div>
                <div style={{ fontSize: 11, color: C.muted, wordBreak: "break-all" }}>
                  Visualizando: {viewingOwner.name?.trim() || viewingOwner.email}
                </div>
              </Link>
            )}

            {ITEMS.filter((it) => !(viewingOwner && it.href === "/receitas")).map((it) => {
              const href =
                viewingOwner && it.ownerAware
                  ? `${it.href}?owner=${viewingOwner.ownerUserId}`
                  : it.href;
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={href}
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    background: active ? C.panel2 : "transparent",
                    border: `1px solid ${active ? C.accent : C.line}`,
                    borderRadius: 10,
                    color: C.ink,
                    textDecoration: "none",
                    transition: "background .15s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: active ? C.accent : C.ink,
                      marginBottom: 2,
                    }}
                  >
                    {it.label}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>{it.sub}</div>
                </Link>
              );
            })}

            {sharedWithMe.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    marginBottom: 8,
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: C.muted,
                  }}
                >
                  Compartilhado comigo ({sharedWithMe.length})
                </div>
                <SearchableSelect
                  options={sharedOptions}
                  value={viewingOwnerId ?? ""}
                  onChange={navigateToShared}
                  placeholder="Buscar relatório…"
                />
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: C.muted,
                    lineHeight: 1.4,
                  }}
                >
                  Abre em modo somente leitura.
                </div>
              </div>
            )}

            <div style={{ flex: 1 }} />
            <div
              style={{
                paddingTop: 12,
                borderTop: `1px solid ${C.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {userEmail && (
                <div style={{ fontSize: 11, color: C.muted, wordBreak: "break-all" }}>
                  {userEmail}
                </div>
              )}
              <form action={logoutAction}>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: C.panel2,
                    border: `1px solid ${C.line}`,
                    borderRadius: 8,
                    color: C.ink,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Sair
                </button>
              </form>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  letterSpacing: ".08em",
                  color: C.muted,
                  textAlign: "center",
                }}
              >
                painel NFC-e · v0.1
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
