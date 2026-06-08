import { getListaCompras } from "@/lib/db";

export const dynamic = "force-dynamic";

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

const sectionTitle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: 10,
};

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: C.muted,
  padding: "10px 8px",
  borderBottom: `1px solid ${C.line}`,
};

const td: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: `1px solid ${C.line}`,
  fontSize: 13,
  color: C.ink,
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtQt = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");

export default async function ListaComprasPage() {
  const items = await getListaCompras();

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
        <div style={sectionTitle}>Compras · recorrentes</div>
        <h1 style={{ margin: 0, marginBottom: 6, fontSize: 26 }}>Lista de compras</h1>
        <p style={{ margin: 0, marginBottom: 20, color: C.muted, fontSize: 13 }}>
          Itens que apareceram em <strong>3 ou mais notas distintas</strong>. Atualiza
          sozinha sempre que você sobe um cupom novo.
        </p>

        {items.length === 0 ? (
          <div style={card}>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
              Ainda não há itens com 3+ ocorrências. Suba mais cupons para começar a
              ver padrões.
            </p>
          </div>
        ) : (
          <div style={card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Produto</th>
                    <th style={{ ...th, textAlign: "right" }}>Vezes</th>
                    <th style={{ ...th, textAlign: "right" }}>Preço médio</th>
                    <th style={{ ...th, textAlign: "right" }}>Última compra</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.produto}>
                      <td style={td}>
                        <div>{it.produto}</div>
                        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                          total comprado: {fmtQt(it.total_qt)} {it.un ?? ""}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "right", color: C.accent2, fontWeight: 600 }}>
                        {it.vezes}×
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{fmtBRL(it.preco_medio)}</td>
                      <td style={{ ...td, textAlign: "right", color: C.muted }}>
                        {it.ultima_compra}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
