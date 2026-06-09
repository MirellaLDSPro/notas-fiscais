import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, isAdminEmail, requireAdmin, userIdFromSession } from "@/auth";
import {
  deleteUser,
  deleteUserNotas,
  getAdminStats,
  listAllUsers,
  listRecentActivity,
} from "@/lib/db";

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

const labelMono: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 10,
  letterSpacing: ".15em",
  textTransform: "uppercase",
  color: C.muted,
};

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const fmtNum = new Intl.NumberFormat("pt-BR");

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; target?: string }>;
}) {
  await requireAdmin();
  const { result, target } = await searchParams;

  const [stats, users, activity] = await Promise.all([
    getAdminStats(),
    listAllUsers(),
    listRecentActivity(50),
  ]);

  async function resetUserAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) redirect("/dashboard");
    const id = Number(formData.get("userId"));
    if (!Number.isFinite(id) || id <= 0) redirect("/admin?result=invalid");
    const n = await deleteUserNotas(id);
    revalidatePath("/admin");
    redirect(`/admin?result=reset&target=${n}`);
  }

  async function deleteUserAction(formData: FormData) {
    "use server";
    const session = await auth();
    const viewerId = userIdFromSession(session);
    if (!isAdminEmail(session?.user?.email)) redirect("/dashboard");
    const id = Number(formData.get("userId"));
    if (!Number.isFinite(id) || id <= 0) redirect("/admin?result=invalid");
    if (id === viewerId) redirect("/admin?result=self");
    await deleteUser(id);
    revalidatePath("/admin");
    redirect("/admin?result=deleted");
  }

  const banner = (() => {
    if (!result) return null;
    if (result === "reset")
      return { text: `${target ?? "?"} nota(s) removida(s) — usuário mantido.`, color: C.accent2 };
    if (result === "deleted") return { text: "Usuário e dados excluídos.", color: C.accent2 };
    if (result === "self") return { text: "Não dá pra excluir você mesmo.", color: C.warn };
    if (result === "invalid") return { text: "Operação inválida.", color: C.warn };
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
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={sectionTitle}>Admin</div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-.02em",
            margin: "0 0 8px",
          }}
        >
          Painel <em style={{ color: C.accent2 }}>administrativo</em>
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px" }}>
          Visão global da base. Acesso restrito aos emails em{" "}
          <code style={{ fontFamily: "monospace", color: C.ink }}>AUTH_ALLOWED_EMAILS</code>.
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <StatCard label="Usuários" value={fmtNum.format(stats.totalUsers)} />
          <StatCard label="Notas" value={fmtNum.format(stats.totalNotas)} />
          <StatCard label="Itens" value={fmtNum.format(stats.totalItens)} />
          <StatCard label="Gasto agregado" value={fmtBRL.format(stats.gastoTotal)} />
          <StatCard label="Estabelecimentos" value={fmtNum.format(stats.totalEstabelecimentos)} />
          <StatCard
            label="Sem geo"
            value={fmtNum.format(stats.estabelecimentosSemGeo)}
            hint="CNPJs sem lat/long — falha no enrich"
            warn={stats.estabelecimentosSemGeo > 0}
          />
        </div>

        <div style={sectionTitle}>Usuários ({users.length})</div>
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) repeat(3, minmax(0, 1fr)) auto",
              gap: 0,
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: C.muted,
              padding: "10px 14px",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div>Email</div>
            <div style={{ textAlign: "right" }}>Notas</div>
            <div style={{ textAlign: "right" }}>Gasto</div>
            <div style={{ textAlign: "right" }}>Último upload</div>
            <div style={{ width: 160, textAlign: "right" }}>Ações</div>
          </div>
          {users.length === 0 && (
            <div style={{ padding: 22, color: C.muted, fontSize: 13, textAlign: "center" }}>
              Nenhum usuário ainda.
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) repeat(3, minmax(0, 1fr)) auto",
                gap: 0,
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: `1px solid ${C.line}`,
                fontSize: 13,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.ink, wordBreak: "break-all" }}>{u.email}</div>
                <div style={{ ...labelMono, marginTop: 2 }}>
                  #{u.id}
                  {u.name ? ` · ${u.name}` : ""} · desde {u.createdAt.slice(0, 10)}
                </div>
              </div>
              <div style={{ textAlign: "right", fontFamily: "monospace" }}>
                {fmtNum.format(u.qtdNotas)}
              </div>
              <div style={{ textAlign: "right", fontFamily: "monospace" }}>
                {fmtBRL.format(u.gastoTotal)}
              </div>
              <div style={{ textAlign: "right", fontFamily: "monospace", color: C.muted }}>
                {u.ultimaNota ? u.ultimaNota.slice(0, 10) : "—"}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", width: 160 }}>
                <form action={resetUserAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      color: C.muted,
                      border: `1px solid ${C.line}`,
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                    title="Apaga só as notas/itens — usuário mantém login"
                  >
                    Resetar
                  </button>
                </form>
                <form action={deleteUserAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      color: C.warn,
                      border: `1px solid ${C.line}`,
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                    title="Apaga conta + notas + compartilhamentos"
                  >
                    Excluir
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        <div style={sectionTitle}>Atividade recente ({activity.length})</div>
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr) auto",
              gap: 0,
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: C.muted,
              padding: "10px 14px",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div>Usuário</div>
            <div>Emitente · Nº</div>
            <div style={{ textAlign: "right" }}>Valor</div>
            <div style={{ width: 130, textAlign: "right" }}>Quando</div>
          </div>
          {activity.length === 0 && (
            <div style={{ padding: 22, color: C.muted, fontSize: 13, textAlign: "center" }}>
              Nenhuma nota processada ainda.
            </div>
          )}
          {activity.map((a) => (
            <div
              key={a.notaId}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr) auto",
                gap: 0,
                alignItems: "center",
                padding: "10px 14px",
                borderBottom: `1px solid ${C.line}`,
                fontSize: 12,
              }}
            >
              <div style={{ color: C.ink, wordBreak: "break-all" }}>{a.userEmail}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.ink }}>{a.emitente}</div>
                <div style={{ ...labelMono, marginTop: 2 }}>
                  #{a.numero} · {a.fonte}
                </div>
              </div>
              <div style={{ textAlign: "right", fontFamily: "monospace" }}>
                {fmtBRL.format(a.valorTotal)}
              </div>
              <div
                style={{
                  width: 130,
                  textAlign: "right",
                  fontFamily: "monospace",
                  color: C.muted,
                }}
              >
                {a.createdAt.slice(0, 16).replace("T", " ")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${warn ? C.warn : C.accent}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={labelMono}>{label}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginTop: 6,
          letterSpacing: "-.01em",
          color: warn ? C.warn : C.ink,
          fontFamily: "monospace",
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>
      )}
    </div>
  );
}
