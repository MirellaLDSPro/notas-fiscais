import Image from "next/image";
import Link from "next/link";
import LandingScreenshot from "./LandingScreenshot";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

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

type Props = {
  dict: Dictionary;
  locale: Locale;
};

export default function LandingPage({ dict, locale }: Props) {
  const switchHref = locale === "pt" ? "/en" : "/";

  return (
    <main
      style={{
        background: C.bg,
        color: C.ink,
        minHeight: "100dvh",
        fontFamily:
          "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
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
          {dict.nav.brand}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href={switchHref}
            aria-label={dict.nav.switchLanguageLabel}
            style={{
              padding: "8px 12px",
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 12,
              letterSpacing: ".12em",
              textDecoration: "none",
            }}
          >
            {dict.nav.switchLanguage}
          </Link>
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
            {dict.nav.signIn}
          </Link>
        </div>
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
            {dict.hero.eyebrow}
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
            {dict.hero.titleStart}
            <span style={{ color: C.accent }}>{dict.hero.titleAccent}</span>
            {dict.hero.titleEnd}
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
            {dict.hero.description}
          </p>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
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
              {dict.hero.ctaPrimary}
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
              {dict.hero.ctaSecondary}
            </a>
          </div>
        </div>

        <LandingScreenshot
          src="/landing-dashboard.png"
          alt={dict.hero.screenshotAlt}
          labels={dict.screenshot}
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
          {dict.features.eyebrow}
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
          {dict.features.heading}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {dict.features.items.map((f) => (
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
          {dict.charts.eyebrow}
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
          {dict.charts.heading}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {dict.charts.items.map((g) => (
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
                <div
                  style={{ fontSize: 13, lineHeight: 1.55, color: C.muted }}
                >
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
          {dict.howItWorks.eyebrow}
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
          {dict.howItWorks.heading}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {dict.howItWorks.steps.map((s) => (
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
              {dict.cta.title}
            </div>
            <div style={{ fontSize: 14, color: C.muted }}>{dict.cta.body}</div>
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
            {dict.cta.button}
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
          <div>{dict.footer.brand}</div>
          <div>{dict.footer.note}</div>
        </div>
      </footer>
    </main>
  );
}
