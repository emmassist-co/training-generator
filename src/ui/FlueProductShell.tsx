/** @jsxImportSource hono/jsx */

export type FlueSection = "home" | "coach" | "history";

export function FlueWordmark() {
  return (
    <a class="flue-wordmark" href="/" aria-label="Flue">
      <span aria-hidden="true">FLU<span class="flue-wordmark-e">E</span></span>
    </a>
  );
}

export function FlueMasthead({ active, sectionLabel }: { active: FlueSection; sectionLabel: string }) {
  const links: Array<{ href: string; key: FlueSection; label: string }> = [
    { href: "/", key: "home", label: "Home" },
    { href: "/chat", key: "coach", label: "Coach" },
    { href: "/history", key: "history", label: "History" },
  ];
  return (
    <header class="site-masthead">
      <FlueWordmark />
      <div class="site-section">{sectionLabel}</div>
      <nav class="site-nav" aria-label="Primary">
        {links.map((link) => (
          <a href={link.href} aria-current={active === link.key ? "page" : undefined}>{link.label}</a>
        ))}
      </nav>
    </header>
  );
}
