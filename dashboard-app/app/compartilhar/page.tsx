import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, userIdFromSession } from "@/auth";
import { addShare, listSharesByOwner, removeShare } from "@/lib/db";

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

export default async function CompartilharPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; email?: string }>;
}) {
  const session = await auth();
  const userId = userIdFromSession(session);
  if (!userId) redirect("/login");

  const { result, email: emailParam } = await searchParams;
  const shares = await listSharesByOwner(userId);

  async function addAction(formData: FormData) {
    "use server";
    const session2 = await auth();
    const ownerId = userIdFromSession(session2);
    if (!ownerId) redirect("/login");
    const email = String(formData.get("email") ?? "");
    const r = await addShare(ownerId, email);
    revalidatePath("/compartilhar");
    redirect(`/compartilhar?result=${r}&email=${encodeURIComponent(email)}`);
  }

  async function removeAction(formData: FormData) {
    "use server";
    const session2 = await auth();
    const ownerId = userIdFromSession(session2);
    if (!ownerId) redirect("/login");
    const email = String(formData.get("email") ?? "");
    await removeShare(ownerId, email);
    revalidatePath("/compartilhar");
    redirect("/compartilhar?result=removed");
  }

  const banner = (() => {
    if (!result) return null;
    if (result === "created") return { text: `${emailParam} adicionado.`, color: C.accent2 };
    if (result === "exists") return { text: `${emailParam} já tinha acesso.`, color: C.muted };
    if (result === "invalid") return { text: "Email inválido (ou é o seu próprio).", color: C.warn };
    if (result === "removed") return { text: "Acesso removido.", color: C.muted };
    return null;
  })();

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
          Acesso · compartilhamento
        </div>
        <h1 style={{ margin: 0, marginBottom: 6, fontSize: 26 }}>Compartilhar relatório</h1>
        <p style={{ margin: 0, marginBottom: 20, color: C.muted, fontSize: 13 }}>
          Dê acesso de leitura aos seus gráficos e preços. Quem recebe verá uma
          opção extra no menu — não pode subir notas nem alterar nada.
        </p>

        {banner && (
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderLeft: `3px solid ${banner.color}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: C.ink,
              marginBottom: 16,
            }}
          >
            {banner.text}
          </div>
        )}

        <form
          action={addAction}
          style={{
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <input
            type="email"
            name="email"
            required
            placeholder="email@exemplo.com"
            style={{
              flex: "1 1 220px",
              minWidth: 0,
              padding: "10px 12px",
              background: C.panel2,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              color: C.ink,
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 18px",
              background: C.accent,
              color: "#0a0a0a",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Adicionar
          </button>
        </form>

        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: C.muted,
            marginBottom: 8,
          }}
        >
          Tem acesso ao seu relatório
        </div>

        {shares.length === 0 ? (
          <div
            style={{
              padding: 22,
              background: C.panel,
              border: `1px dashed ${C.line}`,
              borderRadius: 12,
              color: C.muted,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Ninguém ainda. Adicione um email acima.
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {shares.map((s) => (
              <li
                key={s.email}
                style={{
                  background: C.panel,
                  border: `1px solid ${C.line}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: C.ink, wordBreak: "break-all" }}>
                    {s.email}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    desde {s.created_at.slice(0, 10)}
                  </div>
                </div>
                <form action={removeAction}>
                  <input type="hidden" name="email" value={s.email} />
                  <button
                    type="submit"
                    style={{
                      padding: "8px 12px",
                      background: "transparent",
                      color: C.warn,
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
