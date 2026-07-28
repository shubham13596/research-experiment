import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MODELS, MODEL_ORDER, type Stock } from "@/lib/models";

/**
 * Share card. Set in Courier Prime rather than the site's display face because
 * satori handles static TTFs reliably and variable fonts poorly — and the
 * monospace is the more recognisable half of the identity anyway.
 *
 * Fonts are read from public/fonts rather than fetched at request time, so a
 * network blip can't produce a broken card.
 */

export const runtime = "nodejs";
export const alt =
  "It's Not a Lie — can you get an AI to say a fandom fact wrong? Independent research.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STOCK_HEX: Record<Stock, string> = {
  blue: "#A9C4D8",
  pink: "#E8A9B8",
  goldenrod: "#E0B54A",
  green: "#A8C9A0",
  yellow: "#E5D98A",
  salmon: "#E59A7C",
  white: "#EFE9DA",
};

async function font(file: string) {
  return readFile(join(process.cwd(), "public", "fonts", file));
}

export default async function Image() {
  const [bold, regular] = await Promise.all([
    font("CourierPrime-Bold.ttf"),
    font("CourierPrime-Regular.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#14110E",
          padding: "64px 72px",
          fontFamily: "Courier Prime",
        }}
      >
        {/* Top rail */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            color: "#A29685",
            fontSize: 26,
            letterSpacing: 4,
          }}
        >
          <div style={{ display: "flex", color: "#E8DFC8", fontWeight: 700 }}>
            IT&rsquo;S NOT A LIE<span style={{ color: "#C2402E" }}>.</span>
          </div>
          <div style={{ display: "flex" }}>INDEPENDENT RESEARCH</div>
        </div>

        {/* The hook */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#EFE9DA",
              fontWeight: 700,
              fontSize: 78,
              lineHeight: 1.08,
              letterSpacing: -1,
            }}
          >
            Can you get an AI to say it wrong?
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              color: "#A29685",
              fontSize: 30,
              lineHeight: 1.4,
            }}
          >
            Bring a fact you know cold. Five runs. You grade them.
          </div>
        </div>

        {/* Revision stock, one per model */}
        <div style={{ display: "flex", gap: 14 }}>
          {MODEL_ORDER.map((id) => (
            <div
              key={id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  height: 10,
                  background: STOCK_HEX[MODELS[id].stock],
                }}
              />
              <div style={{ display: "flex", color: "#A29685", fontSize: 24, letterSpacing: 2 }}>
                {MODELS[id].label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Courier Prime", data: bold, weight: 700, style: "normal" },
        { name: "Courier Prime", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
