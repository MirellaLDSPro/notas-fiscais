import { redirect } from "next/navigation";
import { auth, userIdFromSession } from "@/auth";
import { gerarReceitas } from "@/lib/recipes";
import { isFeatureEnabled } from "@/lib/featureFlags";
import RefreshButton from "./RefreshButton";

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
  warn: "#ff7a59",
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

export default async function ReceitasPage() {
  const session = await auth();
  const userId = userIdFromSession(session);
  if (!userId) redirect("/login");
  if (!isFeatureEnabled("receitas", session?.user?.email)) redirect("/dashboard");
  const result = await gerarReceitas(userId);

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
        <div style={sectionTitle}>Cozinha · IA</div>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-.02em",
            margin: "0 0 8px",
          }}
        >
          O que dá pra <em style={{ color: C.accent2 }}>cozinhar</em> hoje.
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px" }}>
          Receitas geradas a partir dos produtos das suas 3 últimas notas com itens.
        </p>

        {!result.ok && result.error.kind === "no_key" && (
          <div style={{ ...card, borderLeft: `3px solid ${C.accent}`, textAlign: "center", padding: 28 }}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: C.accent,
                marginBottom: 10,
              }}
            >
              Em construção
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
              Essa feature ainda está no forno
            </h3>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
              Estamos ajustando os últimos detalhes para sugerir receitas com base nas suas compras.
              Volte em breve!
            </p>
          </div>
        )}

        {!result.ok && result.error.kind === "no_items" && (
          <div style={{ ...card, borderLeft: `3px solid ${C.muted}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>
              Nenhuma nota com itens detalhados ainda
            </h3>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Faça upload de PDFs de NFC-e ou da planilha xlsx para o painel — receitas precisam dos
              produtos item-a-item (notas vindas só do CSV NFP têm só cabeçalho).
            </p>
          </div>
        )}

        {!result.ok && result.error.kind === "api_error" && (
          <div style={{ ...card, borderLeft: `3px solid ${C.warn}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>
              Falha ao chamar o modelo
            </h3>
            <p style={{ fontSize: 13, color: C.warn, margin: 0, fontFamily: "monospace" }}>
              {result.error.message}
            </p>
          </div>
        )}

        {result.ok && (
          <>
            <div
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginBottom: 6,
                  }}
                >
                  Baseado em
                </div>
                <div style={{ fontSize: 13 }}>
                  {result.payload.notas_consideradas.map((n) => (
                    <div key={n.numero} style={{ color: C.ink }}>
                      #{n.numero} · {n.emitente} · {n.data}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  {result.payload.produtos_base.length} produtos únicos ·{" "}
                  {result.cached ? "resultado em cache" : "recém-gerado"}
                </div>
              </div>
              <RefreshButton />
            </div>

            {result.payload.receitas.map((r, i) => (
              <div key={i} style={card}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      margin: 0,
                      letterSpacing: "-.01em",
                    }}
                  >
                    {r.nome}
                  </h3>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: C.muted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.tempo_preparo_min} min · {r.porcoes} porç.
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.muted,
                    margin: "12px 0 6px",
                  }}
                >
                  Ingredientes
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13 }}>
                  {r.ingredientes.map((ing, j) => (
                    <li key={j} style={{ marginBottom: 3, color: C.ink }}>
                      {ing.quantidade} · {ing.item}
                      {ing.nas_notas && (
                        <span style={{ color: C.accent2, fontSize: 11, marginLeft: 6 }}>
                          [nas suas notas]
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.muted,
                    margin: "14px 0 6px",
                  }}
                >
                  Modo de preparo
                </div>
                <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13 }}>
                  {r.modo_preparo.map((step, j) => (
                    <li key={j} style={{ marginBottom: 4, color: C.ink }}>
                      {step}
                    </li>
                  ))}
                </ol>

                {r.dica && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      background: C.panel2,
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: C.ink,
                    }}
                  >
                    <span style={{ color: C.accent, fontWeight: 600 }}>Dica:</span> {r.dica}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        <p
          style={{
            color: C.muted,
            fontSize: 11,
            textAlign: "center",
            marginTop: 24,
            fontFamily: "monospace",
          }}
        >
          gerado por claude-haiku-4-5 · não substitui supervisão humana na cozinha
        </p>
      </div>
    </div>
  );
}
