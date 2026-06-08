import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LandingScreenshot from "./LandingScreenshot";

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

const FEATURES = [
  {
    title: "Importação de cupons",
    body: "Envie PDFs ou escaneie QR codes de NFC-e e o sistema extrai produtos, valores e emitente automaticamente.",
  },
  {
    title: "Dashboard de gastos",
    body: "Veja quanto você gastou por mês, por categoria e por estabelecimento, com gráficos prontos.",
  },
  {
    title: "Preços por período",
    body: "Descubra em que época do ano cada produto fica mais barato e planeje suas compras.",
  },
  {
    title: "Lista de compras inteligente",
    body: "O painel identifica o que você compra com frequência e sugere uma lista baseada no seu histórico.",
  },
  {
    title: "Receitas com o que você tem",
    body: "Receba sugestões de receitas a partir dos itens das suas últimas notas fiscais.",
  },
  {
    title: "Inflação da sua cesta",
    body: "Acompanhe a variação de preço dos seus produtos pessoais ao longo do tempo, e não a média do IBGE.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main
      style={{
        background: C.bg,
        color: C.ink,
        minHeight: "100dvh",
        fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 13,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: C.accent,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: C.accent,
              borderRadius: 2,
            }}
          />
          Painel NFC-e
        </div>
        <Link
          href="/login"
          style={{
            padding: "10px 18px",
            background: C.accent,
            color: "#0a0a0a",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Entrar
        </Link>
      </header>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "64px 24px 48px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 12,
              letterSpacing: ".24em",
              textTransform: "uppercase",
              color: C.accent2,
              marginBottom: 18,
            }}
          >
            Seus cupons fiscais, organizados
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 5vw, 54px)",
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              maxWidth: 820,
            }}
          >
            Entenda quanto você gasta no
            <span style={{ color: C.accent }}> dia a dia</span>, a partir dos
            seus próprios cupons.
          </h1>
          <p
            style={{
              marginTop: 20,
              fontSize: 17,
              lineHeight: 1.55,
              color: C.muted,
              maxWidth: 640,
            }}
          >
            Suba PDFs de NFC-e ou escaneie o QR code do cupom. O painel agrupa
            tudo por mês, categoria e produto — pra você ver pra onde está indo
            o dinheiro do supermercado.
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/login"
              style={{
                padding: "14px 22px",
                background: C.accent,
                color: "#0a0a0a",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Entrar com Google
            </Link>
            <a
              href="#recursos"
              style={{
                padding: "14px 22px",
                background: "transparent",
                color: C.ink,
                border: `1px solid ${C.line}`,
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Ver recursos
            </a>
          </div>
        </div>

        <LandingScreenshot
          src="/landing-dashboard.png"
          alt="Visão do painel NFC-e com totais, gráficos e upload de cupons"
        />
      </section>

      <section
        id="recursos"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
            letterSpacing: ".24em",
            textTransform: "uppercase",
            color: C.accent2,
            marginBottom: 12,
          }}
        >
          Recursos
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            marginBottom: 28,
          }}
        >
          Tudo o que dá pra fazer com os seus cupons
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                padding: 20,
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: C.ink,
                }}
              >
                {f.title}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: C.muted }}>
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
            letterSpacing: ".24em",
            textTransform: "uppercase",
            color: C.accent2,
            marginBottom: 12,
          }}
        >
          O que você vê no painel
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            marginBottom: 28,
          }}
        >
          Seus gastos, em gráficos prontos
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              src: "/landing-chart-gasto-compra.png",
              title: "Gasto por compra",
              body: "Veja o valor de cada nota fiscal ao longo do tempo e identifique os picos do mês.",
              alt: "Gráfico de barras mostrando o gasto de cada nota fiscal por data",
            },
            {
              src: "/landing-chart-onde-dinheiro.png",
              title: "Onde o dinheiro foi",
              body: "Ranking dos produtos que mais pesam no seu orçamento — útil pra repensar prioridades.",
              alt: "Gráfico horizontal com os 8 produtos de maior gasto acumulado",
            },
            {
              src: "/landing-chart-categoria.png",
              title: "Gasto por categoria",
              body: "Agrupamento automático por tipo de produto (carne, vinho, queijo, leite…) com totais acumulados.",
              alt: "Gráfico horizontal com as 10 categorias de maior gasto",
            },
            {
              src: "/landing-chart-preco.png",
              title: "Evolução de preço",
              body: "Acompanhe como o preço unitário de um produto específico se comporta ao longo do tempo.",
              alt: "Gráfico de linha mostrando a evolução do preço unitário de um produto",
            },
          ].map((g) => (
            <div
              key={g.src}
              style={{
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: "16 / 9",
                  background: C.bg,
                  borderBottom: `1px solid ${C.line}`,
                }}
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  sizes="(max-width: 720px) 100vw, 540px"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
              <div style={{ padding: 18 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: C.ink,
                    marginBottom: 6,
                  }}
                >
                  {g.title}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: C.muted }}>
                  {g.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
            letterSpacing: ".24em",
            textTransform: "uppercase",
            color: C.accent2,
            marginBottom: 12,
          }}
        >
          Como funciona
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            marginBottom: 28,
          }}
        >
          Em três passos
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {[
            {
              step: "01",
              title: "Capture o cupom",
              body: "Faça upload do PDF da NFC-e ou aponte a câmera pro QR code impresso no cupom.",
            },
            {
              step: "02",
              title: "Deixe o painel ler",
              body: "Produtos, valores, emitente e data são extraídos automaticamente — nada de digitar.",
            },
            {
              step: "03",
              title: "Use os insights",
              body: "Acompanhe gastos por mês, descubra padrões de preço e receba sugestões de compras.",
            },
          ].map((s) => (
            <div
              key={s.step}
              style={{
                padding: 22,
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 13,
                  color: C.accent,
                  marginBottom: 10,
                }}
              >
                {s.step}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: C.ink,
                }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: C.muted }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 24px 72px",
        }}
      >
        <div
          style={{
            padding: "36px 28px",
            background: `linear-gradient(135deg, ${C.panel} 0%, ${C.panel2} 100%)`,
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: C.ink,
                marginBottom: 6,
              }}
            >
              Pronto pra entrar?
            </div>
            <div style={{ fontSize: 14, color: C.muted }}>
              Acesso restrito a contas autorizadas pelo Google.
            </div>
          </div>
          <Link
            href="/login"
            style={{
              padding: "14px 24px",
              background: C.accent,
              color: "#0a0a0a",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Entrar com Google
          </Link>
        </div>
      </section>

      <footer
        style={{
          borderTop: `1px solid ${C.line}`,
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            fontSize: 12,
            color: C.muted,
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: ".08em",
          }}
        >
          <div>painel NFC-e · v0.1</div>
          <div>uso pessoal · acesso restrito</div>
        </div>
      </footer>
    </main>
  );
}
