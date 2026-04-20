import { ImageResponse } from "next/og";

export const runtime = "edge";
export const revalidate = 86400;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          background: "linear-gradient(135deg, #09090b 0%, #0f0f14 60%, #0c0c12 100%)",
          color: "#ffffff",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Top row: brand + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>
            OneGlanse
          </div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 9999,
              padding: "7px 16px",
              fontSize: 15,
              color: "rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.05)",
              letterSpacing: "0.01em",
            }}
          >
            Free · Open Source · Self-hostable
          </div>
        </div>

        {/* Center: headline + subtitle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "960px" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: "-0.04em",
              color: "#ffffff",
            }}
          >
            The only free,{"\n"}open-source GEO tracker.
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.35,
              maxWidth: "820px",
            }}
          >
            See exactly how your brand appears across ChatGPT, Gemini, Perplexity, Claude, and AI Overview — visibility scores, citations, and sentiment.
          </div>
        </div>

        {/* Bottom: provider pills */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["ChatGPT", "Gemini", "Perplexity", "Claude", "AI Overview"].map((provider) => (
            <div
              key={provider}
              style={{
                border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 17,
                color: "rgba(255,255,255,0.65)",
                background: "rgba(255,255,255,0.05)",
                letterSpacing: "-0.01em",
              }}
            >
              {provider}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
