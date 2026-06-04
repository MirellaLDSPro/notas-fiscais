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

const card: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: 18,
  marginBottom: 20,
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: `1px solid ${C.line}`,
  fontSize: 14,
};

export default function ContatoPage() {
  return (
    <div
      style={{
        background: C.bg,
        color: C.ink,
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        padding: "20px 14px 60px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: C.accent,
            marginBottom: 10,
          }}
        >
          Contato
        </div>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-.02em",
            margin: "0 0 8px",
          }}
        >
          Fale <em style={{ color: C.accent2 }}>comigo</em>.
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px" }}>
          Canais para sugestões, dúvidas ou bugs do painel.
        </p>

        <div style={card}>
          <div style={{ ...row, paddingTop: 0 }}>
            <span style={{ color: C.muted }}>E-mail</span>
            <a
              href="mailto:mirella.lins@mercos.com"
              style={{ color: C.accent, fontFamily: "monospace", textDecoration: "none" }}
            >
              mirella.lins@mercos.com
            </a>
          </div>
          <div style={row}>
            <span style={{ color: C.muted }}>Projeto</span>
            <span style={{ fontFamily: "monospace", color: C.ink }}>Painel NFC-e</span>
          </div>
          <div style={{ ...row, borderBottom: "none", paddingBottom: 0 }}>
            <span style={{ color: C.muted }}>Stack</span>
            <span style={{ fontFamily: "monospace", color: C.ink }}>
              Next.js · SQLite · Claude API
            </span>
          </div>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>
            Sobre o projeto
          </h3>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 8px", lineHeight: 1.5 }}>
            Dashboard pessoal para consolidar gastos a partir de cupons fiscais (NFC-e),
            planilhas e a consulta da Nota Fiscal Paulista. Os dados ficam num SQLite local
            — nada sobe para serviços externos exceto os produtos enviados à API da
            Anthropic na hora de gerar receitas.
          </p>
        </div>
      </div>
    </div>
  );
}
