import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/** Shared branded Open Graph card used by every route's `opengraph-image`. */
export function renderOgImage({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#eef1f4",
          backgroundImage: "radial-gradient(rgba(30,38,48,0.12) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
          color: "#1e2630",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#2f7a73", textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: title.length > 60 ? 60 : 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
          {subtitle && <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#58606d", maxWidth: 960, lineHeight: 1.35 }}>{subtitle.length > 140 ? `${subtitle.slice(0, 137)}…` : subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 12, background: "#2f7a73", color: "#f1f4f7", fontWeight: 700, fontSize: 22 }}>EK</div>
            <div style={{ display: "flex", fontWeight: 700 }}>Ebrahim Khalil</div>
          </div>
          <div style={{ display: "flex", color: "#58606d" }}>Developer · AI student · runner</div>
        </div>
      </div>
    ),
    ogSize,
  );
}
