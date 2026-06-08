import Link from "next/link";

type ViewingAs = {
  ownerUserId: number;
  email: string;
  name: string | null;
};

const C = {
  panel: "#1d2320",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
};

type Props = {
  viewingAs: ViewingAs;
  /** Path do recurso atual (sem query). Usado pra montar o link "sair desta visão". */
  exitHref: string;
};

export default function ViewingAsBanner({ viewingAs, exitHref }: Props) {
  const label = viewingAs.name?.trim() || viewingAs.email;
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${C.accent}`,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        fontSize: 13,
      }}
    >
      <div style={{ color: C.ink, minWidth: 0, flex: 1 }}>
        <span style={{ color: C.muted }}>Visualizando relatório de </span>
        <strong style={{ color: C.ink, wordBreak: "break-all" }}>{label}</strong>
        <span style={{ color: C.muted }}> · somente leitura</span>
      </div>
      <Link
        href={exitHref}
        style={{
          padding: "6px 12px",
          background: "transparent",
          color: C.ink,
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          fontSize: 12,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Sair desta visão
      </Link>
    </div>
  );
}
