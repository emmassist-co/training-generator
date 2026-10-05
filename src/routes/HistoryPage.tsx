/** @jsxImportSource hono/jsx */
import { renderToString } from "hono/jsx/dom/server";
import { FlueMasthead } from "../ui/FlueProductShell.tsx";
import { FLUE_PRODUCT_CSS } from "../ui/flue-product-shell.mjs";
import { HISTORY_PAGE_CSS } from "./history-page-styles.mjs";

export function renderHistoryPage() {
  return HISTORY_PAGE_HTML;
}

function HistoryDocument() {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#10120f" />
        <title>Flue — Training history</title>
        <link rel="preload" href="/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: `${FLUE_PRODUCT_CSS}\n${HISTORY_PAGE_CSS}` }} />
      </head>
      <body>
        <main class="flue-shell history-page">
          <FlueMasthead active="history" sectionLabel="Training history" />
          <section class="history-intro">
            <aside class="history-route">
              <span class="micro-label">Archive / 03</span>
              <strong>Work<br />logged</strong>
              <span class="micro-label">Newest first</span>
            </aside>
            <div class="history-title">
              <p class="kicker">Training record</p>
              <h1 class="display-title">History</h1>
              <p>Review completed, active, and planned sessions without losing the shape of the work.</p>
            </div>
          </section>
          <section class="history-controls" aria-label="History controls">
            <div class="filters">
              <button class="filter active" data-status="">All</button>
              <button class="filter" data-status="completed">Completed</button>
              <button class="filter" data-status="active">Active</button>
              <button class="filter" data-status="planned">Planned</button>
            </div>
            <div class="history-total"><span>Sessions</span><strong id="historyCount">—</strong></div>
          </section>
          <section id="list" class="history-list" aria-live="polite"><p class="history-loading">Loading history…</p></section>
        </main>
        <script type="module" src="/scripts/history.mjs"></script>
      </body>
    </html>
  );
}

const HISTORY_PAGE_HTML = `<!doctype html>${renderToString(<HistoryDocument />)}`;
