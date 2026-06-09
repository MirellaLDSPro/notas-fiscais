import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, isAdminEmail, requireAdmin } from "@/auth";
import {
  deleteErroUpload,
  listAllErrosUpload,
  listNotasParsedByClaude,
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

const card: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: 0,
  overflow: "hidden",
  marginBottom: 20,
};

export default async function AdminErrosPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireAdmin();
  const { result } = await searchParams;
  const [erros, claudeNotas] = await Promise.all([
    listAllErrosUpload(200),
    listNotasParsedByClaude(200),
  ]);
  const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  async function deleteErroAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) redirect("/dashboard");
    const id = Number(formData.get("id"));
    if (!Number.isFinite(id) || id <= 0) redirect("/admin/erros?result=invalid");
    await deleteErroUpload(id);
    revalidatePath("/admin/erros");
    redirect("/admin/erros?result=deleted");
  }

  const banner = (() => {
    if (!result) return null;
    if (result === "deleted") return { text: "Registro removido.", color: C.accent2 };
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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={sectionTitle}>Admin · Erros de upload</div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-.02em",
            margin: "0 0 8px",
          }}
        >
          Notas que <em style={{ color: C.warn }}>falharam</em> no upload
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 16px" }}>
          Cada linha = 1 nota distinta por usuário (dedup por chave de acesso ou hash do arquivo).
          Reuploads da mesma nota não são duplicados.
        </p>

        <Link
          href="/admin"
          style={{
            display: "inline-block",
            marginBottom: 20,
            color: C.muted,
            fontSize: 12,
            fontFamily: "monospace",
            textDecoration: "none",
            borderBottom: `1px dotted ${C.line}`,
          }}
        >
          ← voltar ao painel admin
        </Link>

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

        <div id="auto-parsed" style={sectionTitle}>
          Parseadas pelo Claude ({claudeNotas.length})
        </div>
        <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>
          Notas que o parser regex não conseguiu ler, mas o Claude extraiu via IA.
          Já estão na base — mas revise os dígitos (chave de acesso, valores) porque o OCR pode errar.
        </p>
        <div style={{ ...card, marginBottom: 30 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 2fr) minmax(0, 1fr) auto",
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
            <div>Emitente · Nº · detalhes</div>
            <div style={{ textAlign: "right" }}>Valor</div>
            <div style={{ width: 130, textAlign: "right" }}>Quando</div>
          </div>
          {claudeNotas.length === 0 && (
            <div style={{ padding: 22, color: C.muted, fontSize: 13, textAlign: "center" }}>
              Nenhuma nota parseada pelo Claude ainda.
            </div>
          )}
          {claudeNotas.map((n) => (
            <div
              key={n.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 2fr) minmax(0, 1fr) auto",
                gap: 0,
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: `1px solid ${C.line}`,
                fontSize: 12,
              }}
            >
              <div style={{ minWidth: 0, color: C.ink, wordBreak: "break-all" }}>
                {n.userEmail}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.ink }}>{n.emitente}</div>
                <div style={{ ...labelMono, marginTop: 2, lineHeight: 1.5, wordBreak: "break-all" }}>
                  <div>
                    Nº #{n.numero}
                    {n.serie ? ` · série ${n.serie}` : ""} · {n.dataEmissao} · {n.itensCount} item
                    {n.itensCount === 1 ? "" : "s"}
                  </div>
                  {n.cnpj && <div>CNPJ: {n.cnpj}</div>}
                  {n.chaveAcesso && <div>Chave: {n.chaveAcesso}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right", fontFamily: "monospace", color: C.accent2 }}>
                {BRL.format(n.valorTotal)}
              </div>
              <div
                style={{
                  width: 130,
                  textAlign: "right",
                  fontFamily: "monospace",
                  color: C.muted,
                  fontSize: 11,
                }}
              >
                {n.createdAt.slice(0, 16).replace("T", " ")}
              </div>
            </div>
          ))}
        </div>

        <div style={sectionTitle}>Falha total ({erros.length})</div>
        <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>
          Nem regex nem Claude conseguiram parsear. Os dados parciais extraídos pelo Claude
          aparecem abaixo.
        </p>
        <div style={card}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 2fr) minmax(0, 2fr) auto",
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
            <div>Usuário · arquivo</div>
            <div>Erro · identificadores</div>
            <div style={{ textAlign: "right" }}>Quando</div>
            <div style={{ width: 80, textAlign: "right" }}>Ação</div>
          </div>

          {erros.length === 0 && (
            <div style={{ padding: 22, color: C.muted, fontSize: 13, textAlign: "center" }}>
              Nenhum erro registrado ainda.
            </div>
          )}

          {erros.map((e) => (
            <div
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 2fr) minmax(0, 2fr) auto",
                gap: 0,
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: `1px solid ${C.line}`,
                fontSize: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.ink, wordBreak: "break-all" }}>{e.userEmail}</div>
                <div style={{ ...labelMono, marginTop: 2, wordBreak: "break-all" }}>
                  {e.nomeArquivo}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.warn, wordBreak: "break-word" }}>{e.erro}</div>
                {(e.numero || e.chaveAcesso || e.parsedPartial) && (
                  <div
                    style={{
                      ...labelMono,
                      marginTop: 4,
                      color: C.muted,
                      wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}
                  >
                    {e.parsedPartial?.emitente && (
                      <div style={{ color: C.ink, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>
                        {e.parsedPartial.emitente}
                      </div>
                    )}
                    {(e.numero || e.parsedPartial?.numero) && (
                      <div>Nº #{e.numero ?? e.parsedPartial?.numero}</div>
                    )}
                    {e.parsedPartial?.cnpj && <div>CNPJ: {e.parsedPartial.cnpj}</div>}
                    {e.parsedPartial?.data_emissao && (
                      <div>Data: {e.parsedPartial.data_emissao}</div>
                    )}
                    {typeof e.parsedPartial?.valor_total === "number" && (
                      <div>
                        Total: R$ {e.parsedPartial.valor_total.toFixed(2).replace(".", ",")}
                      </div>
                    )}
                    {typeof e.parsedPartial?.itens_count === "number" && e.parsedPartial.itens_count > 0 && (
                      <div>Itens: {e.parsedPartial.itens_count}</div>
                    )}
                    {(e.chaveAcesso || e.parsedPartial?.chave_acesso) && (
                      <div>Chave: {e.chaveAcesso ?? e.parsedPartial?.chave_acesso}</div>
                    )}
                  </div>
                )}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: "monospace",
                  color: C.muted,
                  fontSize: 11,
                }}
              >
                {e.createdAt.slice(0, 16).replace("T", " ")}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", width: 80 }}>
                <form action={deleteErroAction}>
                  <input type="hidden" name="id" value={e.id} />
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
                    title="Remover este registro"
                  >
                    Excluir
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
