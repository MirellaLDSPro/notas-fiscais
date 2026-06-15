import { resolveDataOwner } from "@/auth";
import { getListaCompras } from "@/lib/db";
import Checklist from "./Checklist";
import ViewingAsBanner from "../ViewingAsBanner";

export const dynamic = "force-dynamic";

const C = {
  bg: "#0d0f0e",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 11,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: 10,
};

export default async function ListaComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const { owner } = await searchParams;
  const { dataUserId, viewingAs } = await resolveDataOwner(owner);
  const items = await getListaCompras(dataUserId);

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
        {viewingAs && <ViewingAsBanner viewingAs={viewingAs} exitHref="/lista-compras" />}
        <div style={sectionTitle}>Compras · recorrentes</div>
        <h1 style={{ margin: 0, marginBottom: 6, fontSize: 26 }}>Lista de compras</h1>
        <p style={{ margin: 0, marginBottom: 20, color: C.muted, fontSize: 13 }}>
          Categorias que apareceram em <strong>2 ou mais notas</strong>. Use as caixinhas
          enquanto faz suas compras — o estado fica salvo nesse aparelho.
        </p>
        <Checklist items={items} />
      </div>
    </div>
  );
}
