import { redirect } from "next/navigation";
import { auth, userIdFromSession } from "@/auth";
import { getListaCompras } from "@/lib/db";
import Checklist from "./Checklist";

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

export default async function ListaComprasPage() {
  const userId = userIdFromSession(await auth());
  if (!userId) redirect("/login");
  const items = await getListaCompras(userId);

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
          Categorias que apareceram em <strong>2 ou mais notas</strong>. Use as caixinhas
          enquanto faz suas compras — o estado fica salvo nesse aparelho.
        </p>
        <Checklist items={items} />
      </div>
    </div>
  );
}
