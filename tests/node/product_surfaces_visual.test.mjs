import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { renderHomePage } from "../../src/routes/HomePage.tsx";
import { renderHistoryPage } from "../../src/routes/HistoryPage.tsx";
import { renderChatPage } from "../../src/routes/ChatPage.tsx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const captureDir = process.env.UPDATE_VISUALS === "1"
  ? path.join(root, "docs/design/product-surfaces/implementation")
  : path.join(tmpdir(), "flue-product-surfaces");
const approvedConcept = await readFile(path.join(root, "docs/design/live-session/concepts/approved-desktop.html"), "utf8");
const imageMatch = approvedConcept.match(/data:image\/jpeg;base64,([^\"]+)/);
assert.ok(imageMatch, "approved exercise image fixture must be available");
const exerciseImage = Buffer.from(imageMatch[1], "base64");
const fixtureAssets = new Map();

function fixtureAsset(filePath) {
  if (!fixtureAssets.has(filePath)) fixtureAssets.set(filePath, readFile(filePath));
  return fixtureAssets.get(filePath);
}

const homeFixture = {
  profiles: [{ id: "alexandre", name: "Alexandre" }, { id: "catarina", name: "Catarina" }],
  active_session: {
    id: "active-session",
    title: "Full body strength",
    status: "active",
    focus: ["Strength", "Control"],
    summary: "Seven movements with a controlled lower-body emphasis.",
    planned_at: "2026-10-05T08:00:00.000Z",
    preview_image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
    exercises: [
      { id: "leg-press", exercise_id: "Leg_Press", name: "Leg Press", images: ["Leg_Press/0.jpg"] },
      { id: "row", exercise_id: "Seated_Cable_Rows", name: "Seated Cable Row", images: ["Seated_Cable_Rows/0.jpg"] },
    ],
  },
  recent_sessions: [
    { id: "recent-1", title: "Upper pull", status: "completed", summary: "5 movements", exercise_count: 5 },
    { id: "recent-2", title: "Lower return", status: "completed", summary: "6 movements", exercise_count: 6 },
  ],
};
const longHistorySummary = "A very long training summary with repeated detail that must stay within the history row without widening the page or pushing metadata out of alignment. ".repeat(8) + "unbroken-detail-token-that-must-wrap-without-breaking-the-history-layout";
const historyFixture = {
  sessions: [
    homeFixture.active_session,
    { ...homeFixture.recent_sessions[0], summary: longHistorySummary },
    homeFixture.recent_sessions[1],
  ],
};

async function openFixture(browser, { html, pathname, viewport }) {
  const context = await browser.newContext({ viewport, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") failures.push(`console: ${message.text()}`); });
  await page.addInitScript(() => localStorage.setItem("trainingCoachProfile", "alexandre"));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === "document") return route.fulfill({ status: 200, contentType: "text/html", body: html });
    if (url.pathname.startsWith("/fonts/")) return route.fulfill({ status: 200, contentType: "font/woff2", body: await fixtureAsset(path.join(root, "public", url.pathname)) });
    if (url.pathname.startsWith("/scripts/")) return route.fulfill({ status: 200, contentType: "text/javascript", body: await fixtureAsset(path.join(root, "public", url.pathname)), headers: { "access-control-allow-origin": "*" } });
    if (url.hostname === "raw.githubusercontent.com") return route.fulfill({ status: 200, contentType: "image/jpeg", body: exerciseImage, headers: { "access-control-allow-origin": "*" } });
    if (url.hostname === "esm.sh") return route.fulfill({ status: 200, contentType: "text/javascript", body: "export function createFlueClient(){return {send:async()=>({}),read:async()=>({output:{text:'Ready'}})}}", headers: { "access-control-allow-origin": "*" } });
    if (url.pathname === "/api/home") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(homeFixture) });
    if (url.pathname === "/api/sessions") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(historyFixture) });
    if (url.pathname === "/api/conversations") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ conversations: [{ id: "conversation-1", title: "Training today", flue_uid: null }] }) });
    if (url.pathname.endsWith("/messages")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ messages: [] }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto(`http://localhost${pathname}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return {
    page,
    failures,
    async close() {
      assert.deepEqual(failures, [], "fixture must have no uncaught page or console errors");
      await context.close();
    },
  };
}

async function assertProductShell(page, label) {
  const result = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const wordmark = document.querySelector(".flue-wordmark");
    const navLinks = [...document.querySelectorAll(".site-nav a")];
    return {
      accent: rootStyle.getPropertyValue("--accent").trim(),
      ground: rootStyle.getPropertyValue("--ground").trim(),
      wordmarkLabel: wordmark?.getAttribute("aria-label"),
      wordmarkFont: wordmark ? getComputedStyle(wordmark).fontFamily : "",
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      navHeights: navLinks.map((link) => link.getBoundingClientRect().height),
    };
  });
  assert.equal(result.accent, "#d9ff5a", `${label}: approved accent token`);
  assert.equal(result.ground, "#10120f", `${label}: approved ground token`);
  assert.equal(result.wordmarkLabel, "Flue", `${label}: branded wordmark`);
  assert.match(result.wordmarkFont, /Barlow Condensed/, `${label}: display type loaded`);
  assert.ok(result.overflow <= 1, `${label}: no horizontal overflow`);
  assert.ok(result.navHeights.every((height) => height >= 44), `${label}: navigation targets remain at least 44px`);
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(captureDir, name), animations: "disabled", fullPage: false });
}

test("home, history, and coach use the responsive Flue product shell with working exercise media", async () => {
  await mkdir(captureDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const fixtures = [
    { name: "home-desktop.png", label: "home desktop", html: renderHomePage(), pathname: "/", viewport: { width: 1440, height: 1000 }, ready: ".feature-media img" },
    { name: "home-mobile.png", label: "home mobile", html: renderHomePage(), pathname: "/", viewport: { width: 390, height: 844 }, ready: ".feature-media img" },
    { name: "history-desktop.png", label: "history desktop", html: renderHistoryPage(), pathname: "/history", viewport: { width: 1440, height: 1000 }, ready: ".history-row" },
    { name: "history-mobile.png", label: "history mobile", html: renderHistoryPage(), pathname: "/history", viewport: { width: 390, height: 844 }, ready: ".history-row" },
    { name: "coach-desktop.png", label: "coach desktop", html: renderChatPage(), pathname: "/chat", viewport: { width: 1440, height: 1000 }, ready: ".msg.assistant" },
    { name: "coach-mobile.png", label: "coach mobile", html: renderChatPage(), pathname: "/chat", viewport: { width: 390, height: 844 }, ready: ".msg.assistant" },
  ];
  try {
    for (const fixture of fixtures) {
      const view = await openFixture(browser, fixture);
      try {
        await view.page.waitForSelector(fixture.ready);
        await assertProductShell(view.page, fixture.label);
        if (fixture.pathname === "/") {
          const image = await view.page.locator(".feature-media img").evaluate((node) => ({ complete: node.complete, width: node.naturalWidth, height: node.naturalHeight }));
          assert.equal(image.complete, true, `${fixture.label}: image completed`);
          assert.ok(image.width > 0 && image.height > 0, `${fixture.label}: exercise image decoded`);
        }
        if (fixture.pathname === "/history") {
          const summary = await view.page.locator(".history-row .row-summary").first().evaluate((node) => {
            const style = getComputedStyle(node);
            return { width: node.scrollWidth - node.clientWidth, height: node.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight) };
          });
          assert.ok(summary.width <= 1, `${fixture.label}: long summary remains within its column`);
          assert.ok(summary.height <= summary.lineHeight * 2 + 1, `${fixture.label}: long summary is clamped to two lines`);
        }
        await capture(view.page, fixture.name);
      } finally {
        await view.close();
      }
    }
  } finally {
    await browser.close();
  }
});
