import Link from "next/link";
import { Footer, TopRail } from "@/components/Chrome";

export default function NotFound() {
  return (
    <>
      <TopRail />
      <main className="shell band">
        <p className="slug">Scene missing</p>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontWeight: 800,
            fontSize: "var(--step-3)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            margin: "0 0 1.2rem",
            maxWidth: "24ch",
          }}
        >
          That page never happened.
        </h1>
        <p className="dim" style={{ maxWidth: "44ch", marginBottom: "2rem" }}>
          Which is, as it happens, one of the six things models say when they
          don&rsquo;t know something. In this case it&rsquo;s true.
        </p>
        <div className="row">
          <Link href="/" className="cta" style={{ textDecoration: "none" }}>
            <span className="cta-lamp" />
            Back to the start
          </Link>
          <Link href="/gallery" className="ghost" style={{ textDecoration: "none" }}>
            See the gallery
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
