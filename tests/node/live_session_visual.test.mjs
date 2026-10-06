import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { renderSessionPage } from "../../src/routes/session-page.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const captureDir = process.env.UPDATE_VISUALS === "1"
  ? path.join(root, "docs/design/live-session/implementation")
  : path.join(tmpdir(), "flue-live-session-visual");
const approvedConcept = await readFile(path.join(root, "docs/design/live-session/concepts/approved-desktop.html"), "utf8");
const imageMatch = approvedConcept.match(/data:image\/jpeg;base64,([^\"]+)/);
assert.ok(imageMatch, "approved exercise image fixture must be available");
const exerciseImage = Buffer.from(imageMatch[1], "base64");

function exercise(overrides = {}) {
  return {
    id: "ex-row",
    exercise_id: "Seated_Cable_Rows",
    name: "Cable Row",
    prescription: { sets: 3, reps: 10, load: "50 kg", rest_seconds: 75 },
    images: ["Seated_Cable_Rows/0.jpg", "Seated_Cable_Rows/1.jpg"],
    equipment: "Cable",
    muscles: ["middle back", "biceps"],
    instructions: [
      "Sit at the cable station with your feet braced and your chest tall.",
      "Pull the handle toward your lower ribs while keeping your torso still.",
      "Return with control and let the shoulder blades move naturally.",
    ],
    rationale: "Build controlled upper-back strength without borrowing motion from the torso.",
    alternatives: [{ name: "Chest-supported dumbbell row" }],
    ...overrides,
  };
}

function session(overrides = {}) {
  return {
    id: "visual-session",
    profile_id: "visual-fixture",
    title: "Upper Pull",
    status: "active",
    active_version: 4,
    exercises: [
      exercise(),
      exercise({ id: "ex-pulldown", exercise_id: "Wide-Grip_Lat_Pulldown", name: "Lat Pulldown", prescription: { sets: 3, reps: 10, load: "45 kg", rest_seconds: 75 } }),
      exercise({ id: "ex-face-pull", exercise_id: "Face_Pull", name: "Face Pull", prescription: { sets: 3, reps: 12, load: "20 kg", rest_seconds: 60 } }),
      exercise({ id: "ex-curl", exercise_id: "Hammer_Curls", name: "Hammer Curl", prescription: { sets: 3, reps: 10, load: "12 kg", rest_seconds: 60 } }),
      exercise({ id: "ex-hang", exercise_id: "Dead_Hang", name: "Dead Hang", prescription: { sets: 2, reps: "30 sec", load: "Bodyweight", rest_seconds: 60 } }),
    ],
    events: [],
    ...overrides,
  };
}

function longCopyExercise() {
  return exercise({
    name: "Single-arm kneeling cable row with rotation",
    prescription: { sets: 4, reps: "8–12 each side", load: "Choose a smooth load that leaves two good repetitions in reserve", rest_seconds: 105 },
    rationale: "Keep the ribs stacked over the pelvis, let the shoulder blade travel naturally, and stop if the long range changes the planned movement quality. ".repeat(3),
    alternatives: [{ name: "Chest-supported single-arm dumbbell row with a neutral grip" }],
  });
}

function setEvent(number, payload = {}) {
  return {
    id: `set-${number}`,
    type: "set_logged",
    created_at: `2026-10-04T10:0${number}:00.000Z`,
    payload: { session_exercise_id: "ex-row", set_number: number, reps: "10", load: "50 kg", note: "", ...payload },
  };
}

async function openFixture(browser, fixture, options = {}) {
  const viewport = options.viewport || { width: 390, height: 844 };
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor || 1,
    reducedMotion: options.reducedMotion || "no-preference",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  await page.addInitScript(({ failEvents, holdEvents }) => {
    const nativeFetch = window.fetch.bind(window);
    const nativeSetInterval = window.setInterval.bind(window);
    window.__visualIntervalHandles = [];
    window.setInterval = (...args) => {
      const handle = nativeSetInterval(...args);
      window.__visualIntervalHandles.push(handle);
      return handle;
    };
    window.__releaseVisualRequest = null;
    window.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.url, location.href);
      if (failEvents && url.pathname.endsWith("/events")) {
        return Promise.resolve(new Response(JSON.stringify({ message: "Connection interrupted" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }));
      }
      if (holdEvents && url.pathname.endsWith("/events")) {
        return new Promise((resolve) => {
          window.__releaseVisualRequest = () => resolve(new Response("{}", {
            status: 201,
            headers: { "content-type": "application/json" },
          }));
        });
      }
      return nativeFetch(input, init);
    };
  }, { failEvents: Boolean(options.failEvents), holdEvents: Boolean(options.holdEvents) });

  const html = renderSessionPage(fixture);
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === "document") {
      await route.fulfill({ status: 200, contentType: "text/html", body: html });
      return;
    }
    if (url.pathname.startsWith("/fonts/")) {
      await route.fulfill({
        status: 200,
        contentType: "font/woff2",
        body: await readFile(path.join(root, "public", url.pathname)),
      });
      return;
    }
    if (url.hostname === "raw.githubusercontent.com" && url.pathname.endsWith(".jpg")) {
      await route.fulfill({ status: 200, contentType: "image/jpeg", body: exerciseImage });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      await route.fulfill({
        status: url.pathname.endsWith("/events") ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "visual-response", status: "active" }),
      });
      return;
    }
    await route.fulfill({ status: 204, body: "" });
  });
  await page.goto("http://localhost/sessions/visual-session", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important}.saved-sets{scrollbar-width:none}.saved-sets::-webkit-scrollbar{display:none}" });
  await page.waitForFunction(() => {
    const activeImage = document.querySelector(".exercise-card.is-active img");
    return !activeImage || (activeImage.complete && activeImage.naturalWidth > 0);
  });
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

async function capture(page, name, { preserveScroll = false } = {}) {
  await page.evaluate((keepScroll) => {
    document.documentElement.style.scrollBehavior = "auto";
    for (const handle of window.__visualIntervalHandles || []) clearInterval(handle);
    window.__visualIntervalHandles = [];
    const elapsed = document.querySelector("#elapsedPill");
    if (elapsed && document.querySelector("#statusPill")?.textContent !== "Completed") elapsed.textContent = "00:00";
    if (!keepScroll) window.scrollTo(0, 0);
    const workspace = document.querySelector(".workspace-scroll");
    if (workspace) {
      workspace.style.scrollBehavior = "auto";
      if (!keepScroll) workspace.scrollTo(0, 0);
    }
  }, preserveScroll);
  await page.screenshot({ path: path.join(captureDir, name), animations: "disabled", fullPage: false });
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(dimensions.page <= dimensions.viewport + 1, `${label}: page width ${dimensions.page} exceeds ${dimensions.viewport}`);
  assert.ok(dimensions.body <= dimensions.viewport + 1, `${label}: body width ${dimensions.body} exceeds ${dimensions.viewport}`);
}

async function assertShellAndActionDoNotOverlap(page, label, scale = 1) {
  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
    };
    return {
      viewportHeight: innerHeight,
      shell: rect(".session-shell"),
      workspace: rect(".workspace-scroll"),
      bottom: rect(".bottom-bar"),
      action: rect(".exercise-card.is-active [data-log-set]"),
    };
  });
  assert.equal(Math.round(geometry.shell.height / scale), geometry.viewportHeight, `${label}: shell must track the viewport`);
  if (geometry.workspace && geometry.bottom) {
    assert.ok(geometry.workspace.bottom <= geometry.bottom.top + 1, `${label}: bottom navigation overlaps the scroll owner`);
  }
  if (geometry.action) {
    await page.locator(".exercise-card.is-active [data-log-set]").scrollIntoViewIfNeeded();
    const visible = await page.evaluate(() => {
      const action = document.querySelector(".exercise-card.is-active [data-log-set]").getBoundingClientRect();
      const workspace = document.querySelector(".workspace-scroll").getBoundingClientRect();
      return action.top >= workspace.top - 1 && action.bottom <= workspace.bottom + 1;
    });
    assert.equal(visible, true, `${label}: primary action must remain reachable inside the scroll owner`);
  }
}

async function assertMinimumTargets(page, label) {
  const failures = await page.evaluate(() => [...document.querySelectorAll("button, a, input, textarea, summary")]
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && !node.disabled;
    })
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return { name: node.getAttribute("aria-label") || node.textContent.trim() || node.getAttribute("name") || node.tagName, width: rect.width, height: rect.height };
    })
    .filter(({ width, height }) => width < 44 || height < 44));
  assert.deepEqual(failures, [], `${label}: every visible enabled interactive target must be at least 44x44 CSS px`);
}

function parseRgb(value) {
  const values = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  assert.equal(values?.length, 3, `expected rgb color, got ${value}`);
  return values;
}

function luminance(rgb) {
  const channels = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const a = luminance(parseRgb(foreground));
  const b = luminance(parseRgb(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("live session visual state matrix remains responsive and accessible", { timeout: 120_000 }, async (t) => {
  await mkdir(captureDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());

  const activeMobile = await openFixture(browser, session());
  await assertNoHorizontalOverflow(activeMobile.page, "390x844 active mobile");
  await assertShellAndActionDoNotOverlap(activeMobile.page, "390x844 active mobile");
  await assertMinimumTargets(activeMobile.page, "390x844 active mobile");
  const colors = await activeMobile.page.evaluate(() => ({
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    primaryText: getComputedStyle(document.querySelector(".current-set-label")).color,
    mutedText: getComputedStyle(document.querySelector(".set-help")).color,
    actionBackground: getComputedStyle(document.querySelector("[data-log-set]")).backgroundColor,
    actionText: getComputedStyle(document.querySelector("[data-log-set]")).color,
    placeholder: getComputedStyle(document.querySelector("[data-exercise-note]"), "::placeholder").color,
  }));
  assert.ok(contrast(colors.primaryText, colors.bodyBackground) >= 4.5, "primary text contrast must meet WCAG AA");
  assert.ok(contrast(colors.mutedText, colors.bodyBackground) >= 4.5, "secondary text contrast must meet WCAG AA");
  assert.ok(contrast(colors.actionText, colors.actionBackground) >= 4.5, "primary action contrast must meet WCAG AA");
  assert.ok(contrast(colors.placeholder, colors.bodyBackground) >= 4.5, "placeholder contrast must meet WCAG AA");
  await capture(activeMobile.page, "active-mobile-390x844.png");
  const activeGuide = activeMobile.page.locator(".context-region.is-active .exercise-guide");
  assert.equal(await activeGuide.locator(".exercise-gallery img").count(), 2);
  assert.match(await activeGuide.textContent(), /How to do it/);
  assert.match(await activeGuide.textContent(), /Pay attention/);
  await activeGuide.scrollIntoViewIfNeeded();
  await capture(activeMobile.page, "exercise-guide-mobile.png", { preserveScroll: true });
  await activeMobile.page.locator(".exercise-card.is-active [data-reps]").scrollIntoViewIfNeeded();

  const focusSequence = [];
  for (let index = 0; index < 9; index += 1) {
    await activeMobile.page.keyboard.press("Tab");
    focusSequence.push(await activeMobile.page.evaluate(() => {
      if (document.activeElement?.matches(".wordmark")) return "home";
      if (document.activeElement?.matches("[data-reps]")) return "reps";
      if (document.activeElement?.matches("[data-load]")) return "load";
      if (document.activeElement?.matches("[data-exercise-note]")) return "note";
      if (document.activeElement?.matches("[data-log-set]")) return "log";
      return document.activeElement?.getAttribute("data-step-field") + ":" + document.activeElement?.getAttribute("data-step");
    }));
  }
  assert.deepEqual(focusSequence, ["home", "reps", "reps:up", "reps:down", "load", "load:up", "load:down", "note", "log"]);
  const focusStyle = await activeMobile.page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor };
  });
  assert.equal(focusStyle.width, "2px");
  assert.equal(focusStyle.style, "solid");
  assert.ok(contrast(focusStyle.color, colors.bodyBackground) >= 3, "focus outline must meet non-text contrast");
  await activeMobile.close();

  const activeDesktop = await openFixture(browser, session(), { viewport: { width: 1440, height: 1200 } });
  await assertNoHorizontalOverflow(activeDesktop.page, "1440x1200 active desktop");
  await assertMinimumTargets(activeDesktop.page, "1440x1200 active desktop");
  const desktopColumns = await activeDesktop.page.evaluate(() => [".route-panel", ".exercise-stage", ".context-column"].map((selector) => {
    const rect = document.querySelector(selector).getBoundingClientRect();
    return Math.round(rect.width);
  }));
  assert.deepEqual(desktopColumns, [220, 740, 340]);
  const desktopBottomBar = await activeDesktop.page.locator(".bottom-bar").boundingBox();
  assert.ok(desktopBottomBar && desktopBottomBar.y >= 0 && desktopBottomBar.y + desktopBottomBar.height <= 1200, "desktop exercise navigation must stay in the viewport");
  const routeColors = await activeDesktop.page.locator('[data-route-item="1"] button').evaluate((button) => ({
    background: getComputedStyle(document.body).backgroundColor,
    name: getComputedStyle(button.querySelector("strong")).color,
    detail: getComputedStyle(button.querySelector("small")).color,
  }));
  assert.ok(contrast(routeColors.name, routeColors.background) >= 4.5, "desktop route names must meet WCAG AA");
  assert.ok(contrast(routeColors.detail, routeColors.background) >= 4.5, "desktop route details must meet WCAG AA");
  const desktopFocus = [];
  for (let index = 0; index < 4; index += 1) {
    await activeDesktop.page.keyboard.press("Tab");
    desktopFocus.push(await activeDesktop.page.evaluate(() => document.activeElement?.matches(".wordmark") ? "home" : document.activeElement?.getAttribute("data-exercise-jump")));
  }
  assert.deepEqual(desktopFocus, ["home", "0", "1", "2"], "home link and desktop route controls must lead keyboard order");
  await capture(activeDesktop.page, "active-desktop-1440x1200.png");
  await activeDesktop.close();

  const shortDesktop = await openFixture(browser, session(), { viewport: { width: 1024, height: 768 } });
  await assertNoHorizontalOverflow(shortDesktop.page, "1024x768 short desktop");
  const shortDesktopBottomBar = await shortDesktop.page.locator(".bottom-bar").boundingBox();
  assert.ok(shortDesktopBottomBar && shortDesktopBottomBar.y >= 0 && shortDesktopBottomBar.y + shortDesktopBottomBar.height <= 768, "short desktop exercise navigation must stay in the viewport");
  await shortDesktop.close();

  for (const viewport of [{ width: 320, height: 568 }, { width: 430, height: 932 }]) {
    const responsive = await openFixture(browser, session(), { viewport });
    await assertNoHorizontalOverflow(responsive.page, `${viewport.width}x${viewport.height}`);
    await assertShellAndActionDoNotOverlap(responsive.page, `${viewport.width}x${viewport.height}`);
    await assertMinimumTargets(responsive.page, `${viewport.width}x${viewport.height}`);
    await responsive.close();
  }

  const safeArea = await openFixture(browser, session(), { viewport: { width: 320, height: 568 } });
  await safeArea.page.addStyleTag({ content: ".session-shell{padding-top:24px!important}.workspace-scroll{padding-left:32px!important;padding-right:28px!important}.bottom-bar{margin-left:32px!important;margin-right:28px!important;padding-bottom:18px!important}" });
  await assertNoHorizontalOverflow(safeArea.page, "nonzero safe-area proxy");
  await assertShellAndActionDoNotOverlap(safeArea.page, "nonzero safe-area proxy");
  const safeInsets = await safeArea.page.evaluate(() => {
    const workspace = getComputedStyle(document.querySelector(".workspace-scroll"));
    const bottom = getComputedStyle(document.querySelector(".bottom-bar"));
    const shell = getComputedStyle(document.querySelector(".session-shell"));
    return [shell.paddingTop, workspace.paddingLeft, workspace.paddingRight, bottom.marginLeft, bottom.marginRight, bottom.paddingBottom];
  });
  assert.deepEqual(safeInsets, ["24px", "32px", "28px", "32px", "28px", "18px"]);
  await safeArea.close();

  const zoomProxy = await openFixture(browser, session({ exercises: [longCopyExercise()] }), { viewport: { width: 640, height: 1136 } });
  await zoomProxy.page.addStyleTag({ content: "html{zoom:2}" });
  await assertNoHorizontalOverflow(zoomProxy.page, "200% CSS zoom proxy with long copy");
  await assertShellAndActionDoNotOverlap(zoomProxy.page, "200% CSS zoom proxy with long copy", 2);
  await assertMinimumTargets(zoomProxy.page, "200% CSS zoom proxy with long copy");
  const zoomTextFits = await zoomProxy.page.locator(".exercise-card.is-active .exercise-media h2").evaluate((title) => title.scrollWidth <= title.clientWidth + 1);
  assert.equal(zoomTextFits, true, "long title must reflow at the 200% zoom proxy");
  await zoomProxy.close();

  const keyboardProxy = await openFixture(browser, session(), { viewport: { width: 390, height: 844 } });
  await keyboardProxy.page.locator(".exercise-card.is-active [data-exercise-note]").focus();
  await keyboardProxy.page.setViewportSize({ width: 390, height: 520 });
  await keyboardProxy.page.locator(".exercise-card.is-active [data-exercise-note]").scrollIntoViewIfNeeded();
  await assertNoHorizontalOverflow(keyboardProxy.page, "contracted keyboard-height proxy");
  const keyboardGeometry = await keyboardProxy.page.evaluate(() => {
    const field = document.querySelector("[data-exercise-note]").getBoundingClientRect();
    const workspace = document.querySelector(".workspace-scroll").getBoundingClientRect();
    const bottom = document.querySelector(".bottom-bar").getBoundingClientRect();
    return { field, workspace, bottom, focused: document.activeElement?.matches("[data-exercise-note]") };
  });
  assert.equal(keyboardGeometry.focused, true);
  assert.ok(keyboardGeometry.field.top >= keyboardGeometry.workspace.top && keyboardGeometry.field.bottom <= keyboardGeometry.workspace.bottom);
  assert.ok(keyboardGeometry.workspace.bottom <= keyboardGeometry.bottom.top + 1);
  await keyboardProxy.close();

  const reducedMotion = await openFixture(browser, session(), { reducedMotion: "reduce" });
  const motion = await reducedMotion.page.evaluate(() => {
    const action = getComputedStyle(document.querySelector("[data-log-set]"));
    const pending = getComputedStyle(document.querySelector("[data-pending-line] span"));
    return { transition: action.transitionDuration, animation: pending.animationName, scrollBehavior: getComputedStyle(document.querySelector(".workspace-scroll")).scrollBehavior };
  });
  assert.match(motion.transition, /0s|0\.00001s/);
  assert.equal(motion.animation, "none");
  assert.equal(motion.scrollBehavior, "auto");
  await reducedMotion.close();

  const rest = await openFixture(browser, session());
  await rest.page.locator(".exercise-card.is-active [data-log-set]").click();
  await rest.page.waitForFunction(() => document.querySelector(".exercise-card.is-active [data-rest-row]")?.classList.contains("timer-active"));
  assert.equal(await rest.page.locator(".exercise-card.is-active [data-timer-state]").textContent(), "Running");
  assert.equal(await rest.page.locator(".exercise-card.is-active .saved-sets").getAttribute("aria-label"), "Saved sets");
  assert.match(await rest.page.locator(".exercise-card.is-active .saved-sets").textContent(), /01\s+10×50 kg/);
  assert.doesNotMatch(await rest.page.locator(".exercise-card.is-active .saved-sets").textContent(), /No sets logged/);
  await capture(rest.page, "post-log-active-rest-mobile.png");
  await rest.close();

  const extra = await openFixture(browser, session({ events: [setEvent(1), setEvent(2), setEvent(3)] }));
  assert.equal(await extra.page.locator(".exercise-card.is-active [data-action-label]").textContent(), "Add extra set");
  assert.equal(await extra.page.locator(".exercise-card.is-active [data-position-label]").textContent(), "All 3 logged");
  await capture(extra.page, "extra-set-mobile.png");
  await extra.close();

  const pending = await openFixture(browser, session(), { holdEvents: true });
  await pending.page.locator(".exercise-card.is-active [data-log-set]").click();
  await pending.page.waitForFunction(() => document.querySelector(".exercise-card.is-active [data-log-set]")?.getAttribute("aria-busy") === "true");
  assert.equal(await pending.page.locator(".exercise-card.is-active [data-log-set]").isDisabled(), true);
  assert.equal(await pending.page.locator(".exercise-card.is-active [data-action-label]").textContent(), "Sending set…");
  await capture(pending.page, "pending-mobile.png");
  await pending.page.evaluate(() => window.__releaseVisualRequest?.());
  await pending.page.waitForFunction(() => !document.querySelector("[data-log-set]")?.disabled);
  await pending.close();

  const error = await openFixture(browser, session(), { failEvents: true });
  await error.page.locator(".exercise-card.is-active [data-exercise-note]").fill("Grip slipped; keep the next set lighter.");
  await error.page.locator(".exercise-card.is-active [data-log-set]").click();
  await error.page.locator(".exercise-card.is-active [data-error]").waitFor({ state: "visible" });
  assert.equal(await error.page.locator(".exercise-card.is-active [data-error]").getAttribute("role"), "alert");
  assert.equal(await error.page.locator(".exercise-card.is-active [data-error-title]").textContent(), "Not saved");
  assert.equal(await error.page.locator(".exercise-card.is-active [data-error-trace]").textContent(), "Sending… → Not saved");
  assert.match(await error.page.locator(".exercise-card.is-active [data-error-detail]").textContent(), /values are still here/i);
  assert.equal(await error.page.locator(".exercise-card.is-active [data-exercise-note]").inputValue(), "Grip slipped; keep the next set lighter.");
  await capture(error.page, "error-values-kept-mobile.png");
  await error.close();

  const completed = await openFixture(browser, session({
    status: "completed",
    started_at: "2026-10-04T09:47:54.000Z",
    completed_at: "2026-10-04T10:30:00.000Z",
    completed_exercise_ids: ["ex-row"],
    events: [setEvent(1), setEvent(2), setEvent(3, { note: "Smooth final set." }), { id: "note", type: "note_added", payload: { note: "Good session." } }],
  }));
  assert.equal(await completed.page.locator("[data-log-set]").count(), 0);
  assert.equal(await completed.page.locator("[data-write-control]").count(), 0);
  assert.equal(await completed.page.locator("#elapsedPill").textContent(), "42:06");
  await assertNoHorizontalOverflow(completed.page, "completed read-only");
  await capture(completed.page, "completed-read-only-mobile.png");
  assert.equal(await completed.page.locator("#nextExercise").isDisabled(), false);
  await completed.close();

  const empty = await openFixture(browser, session({ exercises: [] }));
  assert.equal(await empty.page.locator(".empty-session").isVisible(), true);
  await assertNoHorizontalOverflow(empty.page, "empty workout");
  await capture(empty.page, "empty-mobile.png");
  const emptyHeader = await empty.page.evaluate(() => {
    const rect = document.querySelector(".wordmark").getBoundingClientRect();
    return { scrollY, top: rect.top, visible: getComputedStyle(document.querySelector(".wordmark")).display !== "none" };
  });
  assert.equal(emptyHeader.scrollY, 0);
  assert.equal(emptyHeader.visible, true);
  assert.ok(emptyHeader.top >= 15 && emptyHeader.top <= 17, "empty-state masthead home target must remain in view");
  await empty.close();

  const longCopy = await openFixture(browser, session({ exercises: [longCopyExercise()] }));
  await assertNoHorizontalOverflow(longCopy.page, "long-copy fixture");
  const longTextLayout = await longCopy.page.evaluate(() => {
    const title = document.querySelector(".exercise-card.is-active .exercise-media h2").getBoundingClientRect();
    const caption = document.querySelector(".exercise-card.is-active .exercise-media figcaption").getBoundingClientRect();
    const widths = [...document.querySelectorAll("h2, .plan-copy, .details-panel p, .metric-strip.mobile strong")].map((node) => ({ scroll: node.scrollWidth, client: node.clientWidth }));
    return { titleBottom: title.bottom, captionTop: caption.top, widths };
  });
  assert.equal(longTextLayout.widths.every(({ scroll, client }) => scroll <= client + 1), true, "long text must wrap without horizontal clipping");
  assert.ok(longTextLayout.titleBottom <= longTextLayout.captionTop + 1, `long exercise title must not collide with its caption (${longTextLayout.titleBottom} > ${longTextLayout.captionTop})`);
  await capture(longCopy.page, "long-copy-mobile.png");
  await longCopy.close();
});
