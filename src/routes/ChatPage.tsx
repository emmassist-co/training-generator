/** @jsxImportSource hono/jsx */
import { renderToString } from "hono/jsx/dom/server";
import { FlueMasthead } from "../ui/FlueProductShell.tsx";
import { FLUE_PRODUCT_CSS } from "../ui/flue-product-shell.mjs";
import { CHAT_PAGE_CSS } from "./chat-page-styles.mjs";

export function renderChatPage() {
  return CHAT_PAGE_HTML;
}

function ChatDocument() {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#10120f" />
        <title>Flue — Training coach</title>
        <link rel="preload" href="/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: `${FLUE_PRODUCT_CSS}\n${CHAT_PAGE_CSS}` }} />
      </head>
      <body>
        <main class="flue-shell coach-page">
          <FlueMasthead active="coach" sectionLabel="Training coach" />
          <div class="coach-layout">
            <aside class="coach-rail">
              <p class="kicker">Hosted training agent</p>
              <h1>Training coach</h1>
              <p class="sub">Create sessions, swap movements, answer mid-workout questions, and log completions into the hosted training history.</p>
              <div class="topline">
                <div class="profile-bar" id="profiles" aria-label="Profile">
                  <button type="button" class="chip active" data-profile="default">default</button>
                </div>
                <select class="conversation-select" id="conversationSelect" aria-label="Conversation"></select>
                <button type="button" class="ghost" id="newConversation">New chat</button>
              </div>
              <div class="status-card">
                <span class="status-label">Connection</span>
                <span class="status" id="status"><span class="dot"></span><span id="statusText">ready</span></span>
              </div>
            </aside>
            <section class="chat" id="chat" aria-live="polite"></section>
            <form id="form">
              <div class="input-wrap">
                <textarea id="input" rows={2} placeholder="Ask for a session, edit the active workout, or log what you completed…"></textarea>
                <div class="composer-meta"><span id="charCount">0</span></div>
              </div>
              <div class="actions">
                <button class="send" id="send" type="submit" disabled>Send</button>
                <div class="hint">⌘/Ctrl + Enter · ⌘/Ctrl + K</div>
              </div>
            </form>
          </div>
        </main>
        <script type="module" src="/scripts/chat.mjs"></script>
      </body>
    </html>
  );
}

const CHAT_PAGE_HTML = `<!doctype html>${renderToString(<ChatDocument />)}`;
