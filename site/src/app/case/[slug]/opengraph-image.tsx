import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublicCase } from "@/lib/db";
import { modelDisplay, MODELS, type Stock } from "@/lib/models";
import { findStudyCase } from "@/lib/study-cases";

/**
 * Per-case share card. The point is that a posted link previews the actual
 * finding — the question, the real answer, and what the model said instead —
 * rather than a generic site banner.
 */

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A fandom fact an AI gets wrong, with the correct answer.";

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

interface CardData {
  work: string;
  question: string;
  answer: string;
  attractor: string | null;
  footnote: string;
  stocks: Stock[];
}

async function resolve(slug: string): Promise<CardData | null> {
  const study = findStudyCase(slug);
  if (study) {
    return {
      work: study.work,
      question: study.question,
      answer: study.groundTruth,
      attractor: study.attractor,
      footnote: `Verified · ${study.id}`,
      stocks: study.observed.map((o) => modelDisplay(o.model).stock),
    };
  }

  const found = await getPublicCase(slug);
  if (!found) return null;

  const { summary, responses } = found;
  const named = responses.find((r) => r.wrong_answer_given)?.wrong_answer_given ?? null;
  return {
    work: summary.work,
    question: summary.question,
    answer: summary.ground_truth || summary.claimed_truth,
    attractor: named,
    footnote: `Graded wrong ${summary.failures} of ${summary.graded} by ${summary.visitors} ${
      summary.visitors === 1 ? "visitor" : "visitors"
    }`,
    stocks: summary.per_model.map((m) => MODELS[m.model_id].stock),
  };
}

/** Long questions have to shrink or they overflow the card. */
function questionSize(text: string): number {
  if (text.length > 120) return 44;
  if (text.length > 80) return 52;
  if (text.length > 50) return 62;
  return 72;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, bold, regular] = await Promise.all([
    resolve(slug),
    font("CourierPrime-Bold.ttf"),
    font("CourierPrime-Regular.ttf"),
  ]);

  const fonts = [
    { name: "Courier Prime", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Courier Prime", data: regular, weight: 400 as const, style: "normal" as const },
  ];

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#14110E",
            color: "#EFE9DA",
            fontFamily: "Courier Prime",
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          It&rsquo;s Not a Lie
        </div>
      ),
      { ...size, fonts },
    );
  }

  const stocks = data.stocks.length > 0 ? data.stocks : (["blue"] as Stock[]);

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
          padding: "58px 68px",
          fontFamily: "Courier Prime",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            color: "#A29685",
            fontSize: 24,
            letterSpacing: 4,
          }}
        >
          <div style={{ display: "flex", color: "#E8DFC8", fontWeight: 700 }}>
            {data.work.toUpperCase()}
          </div>
          <div style={{ display: "flex" }}>IT&rsquo;S NOT A LIE</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#EFE9DA",
              fontWeight: 700,
              fontSize: questionSize(data.question),
              lineHeight: 1.14,
              letterSpacing: -1,
            }}
          >
            {data.question}
          </div>

          {/* The payoff: correct answer against what the model reaches for. */}
          <div style={{ display: "flex", marginTop: 34, gap: 72 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", color: "#A8C9A0", fontSize: 22, letterSpacing: 3 }}>
                THE ANSWER
              </div>
              <div
                style={{ display: "flex", color: "#EFE9DA", fontSize: 44, fontWeight: 700 }}
              >
                {data.answer}
              </div>
            </div>
            {data.attractor ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", color: "#C2402E", fontSize: 22, letterSpacing: 3 }}>
                  IT SAYS
                </div>
                <div
                  style={{ display: "flex", color: "#EFE9DA", fontSize: 44, fontWeight: 700 }}
                >
                  {data.attractor}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {stocks.map((stock, i) => (
              <div
                key={`${stock}-${i}`}
                style={{ display: "flex", height: 9, width: 118, background: STOCK_HEX[stock] }}
              />
            ))}
          </div>
          <div style={{ display: "flex", color: "#A29685", fontSize: 24 }}>{data.footnote}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
