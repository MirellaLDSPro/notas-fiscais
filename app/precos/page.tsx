import { redirect } from "next/navigation";
import { auth, userIdFromSession } from "@/auth";
import { getSeriesPrecos } from "@/lib/db";
import PrecosClient from "./PrecosClient";

export const dynamic = "force-dynamic";

const C = {
  bg: "#0d0f0e",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
};

export default async function PrecosPage() {
  const userId = userIdFromSession(await auth());
  if (!userId) redirect("/login");
  const series = await getSeriesPrecos(userId);

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
          Comparador · período
        </div>
        <h1 style={{ margin: 0, marginBottom: 6, fontSize: 26 }}>
          Quando comprar mais barato
        </h1>
        <p style={{ margin: 0, marginBottom: 20, color: C.muted, fontSize: 13 }}>
          Para cada produto recorrente, o preço médio por mês e por dia da semana.
          O melhor mês — quando há histórico — fica destacado.
        </p>
        <PrecosClient series={series} />
      </div>
    </div>
  );
}
