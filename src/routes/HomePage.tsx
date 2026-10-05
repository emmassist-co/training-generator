/** @jsxImportSource hono/jsx */
import { renderToString } from "hono/jsx/dom/server";
import { FlueMasthead } from "../ui/FlueProductShell.tsx";
import { FLUE_PRODUCT_CSS } from "../ui/flue-product-shell.mjs";
import { HOME_PAGE_CSS } from "./home-page-styles.mjs";

export function renderHomePage() {
  return HOME_PAGE_HTML;
}

function HomeDocument() {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#10120f" />
        <title>Flue — Training home</title>
        <link rel="preload" href="/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: `${FLUE_PRODUCT_CSS}\n${HOME_PAGE_CSS}` }} />
      </head>
      <body>
        <main class="flue-shell home-page">
          <FlueMasthead active="home" sectionLabel="Training home" />
          <section class="profile-strip" aria-label="Training profile">
            <div class="profile-label micro-label">Training profile</div>
            <div id="profiles" class="profile-options"></div>
          </section>
          <section id="app" class="home-loading" aria-live="polite">Loading training state…</section>
        </main>
        <script type="module" src="/scripts/home.mjs"></script>
      </body>
    </html>
  );
}

const HOME_PAGE_HTML = `<!doctype html>${renderToString(<HomeDocument />)}`;
