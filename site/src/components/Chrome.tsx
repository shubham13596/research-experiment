import Link from "next/link";

export function TopRail() {
  return (
    <header className="shell">
      <div className="rail">
        <Link href="/" className="wordmark">
          It&rsquo;s Not a Lie<span className="wordmark-mark">.</span>
        </Link>
        <nav className="rail-nav" aria-label="Sections">
          <Link href="/gallery">Gallery</Link>
          <Link href="/about">Method</Link>
          <a href="https://shubhamg.bearblog.dev/llms-defend-fluent-memory/">Write-up</a>
          <a href="https://github.com/shubham13596/research-experiment">Repo</a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-links">
          <Link href="/gallery">Gallery</Link>
          <Link href="/about">Method &amp; privacy</Link>
          <a href="https://shubhamg.bearblog.dev/llms-defend-fluent-memory/">The write-up</a>
          <a href="https://github.com/shubham13596/research-experiment">Data &amp; code</a>
        </div>
        <p>
          Independent research by Shubham Gupta. <strong>Not affiliated with or endorsed by
          Anthropic.</strong> Responses are generated live through the Anthropic API and may be
          wrong — that is the thing being measured.
        </p>
        <p className="mono-note">
          Submissions are logged and may be published as anonymous research data. No accounts, no
          email, no names.
        </p>
      </div>
    </footer>
  );
}
