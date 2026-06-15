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
              href="mailto:mirella.lds@gmail.com"
              style={{ color: C.accent, fontFamily: "monospace", textDecoration: "none" }}
            >
              mirella.lds@gmail.com
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
            O que é o Onde Foi Seu Dinheiro
          </h3>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
            Toda vez que você compra no mercado, recebe um cupom fiscal. Nosso site pega
            esses cupons e mostra, de forma fácil de entender, para onde está indo o seu
            dinheiro.
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
            É simples assim: você envia o PDF do cupom (ou aponta a câmera para o QR code
            dele), e o site lê tudo sozinho — os produtos, os preços e a data. Você não
            precisa digitar nada.
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
            A partir daí, ele monta gráficos que mostram quanto você gastou por mês, quais
            produtos pesam mais no bolso e como o preço de cada item muda com o tempo.
            Também descobre em que época do ano as coisas costumam ficar mais baratas,
            monta uma lista de compras com o que você compra sempre e ainda sugere
            receitas com os produtos das suas últimas notas.
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            Para entrar, basta usar sua conta do Google. Seus dados são só seus — ninguém
            mais vê suas compras, a não ser que você escolha compartilhar seu relatório
            com alguém.
          </p>
        </div>
      </div>
    </div>
  );
}
