const C = {
  bg: "#0d0f0e",
  panel: "#161a18",
  line: "#2a312d",
  ink: "#eef1ee",
  muted: "#8a9690",
  accent: "#d4ff4f",
};

const skeleton: React.CSSProperties = {
  background: `linear-gradient(90deg, ${C.panel} 0%, #1d2320 50%, ${C.panel} 100%)`,
  backgroundSize: "200% 100%",
  borderRadius: 10,
  animation: "pulse 1.4s ease-in-out infinite",
};

const card: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: 18,
  marginBottom: 20,
};

export default function Loading() {
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
      <style>{`@keyframes pulse {0% {background-position: 200% 0;} 100% {background-position: -200% 0;}}`}</style>
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
          Carregando…
        </div>
        <div style={{ ...skeleton, height: 38, width: "70%", marginBottom: 8 }} />
        <div style={{ ...skeleton, height: 16, width: "50%", marginBottom: 24 }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...card, marginBottom: 0, height: 92 }} />
          ))}
        </div>

        <div style={{ ...card, height: 280 }} />
        <div style={{ ...card, height: 340 }} />
      </div>
    </div>
  );
}
