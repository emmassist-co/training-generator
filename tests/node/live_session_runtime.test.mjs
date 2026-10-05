import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { renderSessionPage } from "../../src/routes/session-page.mjs";

function requestBody(request) {
  return request.postDataJSON();
}

async function openInterceptedPage(browser, html, calls) {
  const page = await browser.newPage();
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === "document") {
      await route.fulfill({ status: 200, contentType: "text/html", body: html });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      const body = requestBody(request);
      calls.push({ path: url.pathname, body });
      await route.fulfill({
        status: url.pathname.endsWith("/events") ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify({ id: `response-${calls.length}`, status: "active" }),
      });
      return;
    }
    await route.abort();
  });
  await page.goto("http://localhost/sessions/runtime-session");
  return page;
}

async function capturePost(page, predicate, action) {
  const requestPromise = page.waitForRequest((request) => {
    if (request.method() !== "POST") return false;
    const path = new URL(request.url()).pathname;
    return predicate(path, requestBody(request));
  });
  await action();
  const request = await requestPromise;
  return { path: new URL(request.url()).pathname, body: requestBody(request) };
}

test("set logging exposes pending, blocks duplicates, and keeps values on failure", async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());

  let releaseRequest;
  const release = new Promise((resolve) => { releaseRequest = resolve; });
  const pendingCalls = [];
  const pendingHtml = renderSessionPage({
    id: "pending-session",
    status: "active",
    active_version: 2,
    exercises: [{ id: "ex-1", name: "Cable Row", prescription: { sets: 3, reps: 10, rest_seconds: 2 } }],
    events: [],
  });
  const pendingPage = await browser.newPage();
  await pendingPage.route("**/*", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.resourceType() === "document") return route.fulfill({ status: 200, contentType: "text/html", body: pendingHtml });
    if (path.endsWith("/events")) {
      pendingCalls.push(requestBody(request));
      await release;
      return route.fulfill({ status: 201, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
  await pendingPage.goto("http://localhost/sessions/pending-session");
  const pendingButton = pendingPage.locator("[data-log-set]");
  await pendingButton.click();
  await pendingPage.waitForFunction(() => document.querySelector("[data-log-set]")?.getAttribute("aria-busy") === "true");
  assert.equal(await pendingButton.isDisabled(), true);
  assert.equal(await pendingPage.locator("[data-action-label]").textContent(), "Sending set…");
  assert.equal(await pendingPage.locator("[data-set-feedback]").getAttribute("role"), "status");
  await pendingButton.dispatchEvent("click");
  assert.equal(pendingCalls.length, 1);
  releaseRequest();
  await pendingPage.waitForFunction(() => !document.querySelector("[data-log-set]")?.disabled);
  assert.equal(pendingCalls.length, 1);
  assert.equal(await pendingPage.locator(".saved-sets").getAttribute("aria-label"), "Saved sets");
  assert.match(await pendingPage.locator(".saved-sets").textContent(), /01\s+10×—/);
  assert.doesNotMatch(await pendingPage.locator(".saved-sets").textContent(), /No sets logged/);
  assert.equal(await pendingPage.locator("[data-timer-state]").textContent(), "Running");
  assert.equal(await pendingPage.locator("[data-rest-row]").evaluate((node) => node.classList.contains("timer-active")), true);
  await pendingPage.locator('[data-action="toggle-timer"]').click();
  assert.equal(await pendingPage.locator("[data-timer-state]").textContent(), "Idle");
  await pendingPage.locator('[data-action="toggle-timer"]').click();
  await pendingPage.waitForTimeout(1100);
  await pendingPage.locator('[data-action="toggle-timer"]').click();
  assert.equal(await pendingPage.locator("[data-timer-state]").textContent(), "Paused");
  await pendingPage.locator('[data-action="reset-timer"]').click();
  assert.equal(await pendingPage.locator("[data-timer-state]").textContent(), "Idle");
  assert.equal(await pendingPage.locator("[data-timer]").textContent(), "00:02");
  await pendingPage.close();

  const failedHtml = renderSessionPage({
    id: "failed-session",
    status: "active",
    active_version: 2,
    exercises: [{ id: "ex-1", name: "Cable Row", prescription: { sets: 3, reps: 10 } }],
    events: [],
  });
  const failedPage = await browser.newPage();
  await failedPage.route("**/*", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.resourceType() === "document") return route.fulfill({ status: 200, contentType: "text/html", body: failedHtml });
    if (path.endsWith("/events")) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Network error" }) });
    return route.abort();
  });
  await failedPage.goto("http://localhost/sessions/failed-session");
  await failedPage.locator("[data-reps]").fill("9");
  await failedPage.locator("[data-load]").fill("47.5");
  await failedPage.locator("[data-exercise-note]").fill("Grip slipped");
  await failedPage.locator("[data-log-set]").click();
  await failedPage.locator("[data-error]").waitFor({ state: "visible" });
  assert.match(await failedPage.locator("[data-error]").textContent(), /Not saved.*values are still here/i);
  assert.equal(await failedPage.locator("[data-action-label]").textContent(), "Try log set again");
  assert.equal(await failedPage.locator("[data-reps]").inputValue(), "9");
  assert.equal(await failedPage.locator("[data-load]").inputValue(), "47.5");
  assert.equal(await failedPage.locator("[data-exercise-note]").inputValue(), "Grip slipped");
  assert.equal(await failedPage.locator("[data-log-set]").isDisabled(), false);
});

test("completion stops and remains editable when the structured note write fails", async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const calls = [];
  const html = renderSessionPage({
    id: "note-failure-session",
    status: "active",
    active_version: 2,
    exercises: [{ id: "ex-1", name: "Cable Row", prescription: { sets: 3, reps: 10 } }],
    events: [],
  });
  const page = await browser.newPage();
  await page.route("**/*", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.resourceType() === "document") return route.fulfill({ status: 200, contentType: "text/html", body: html });
    if (path.startsWith("/api/")) {
      const body = requestBody(request);
      calls.push({ path, body });
      if (path.endsWith("/events") && body.type === "note_added") {
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Note save failed" }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
  await page.goto("http://localhost/sessions/note-failure-session");
  await page.locator("#notes").fill("Do not lose this note");
  await page.locator("#complete").click();
  await page.waitForFunction(() => document.querySelector("#toast")?.textContent === "Note save failed");
  assert.equal(calls.some((call) => call.path.endsWith("/complete")), false);
  assert.equal(await page.locator("#notes").isDisabled(), false);
  assert.equal(await page.locator("#complete").isDisabled(), false);
  assert.equal(await page.locator("#statusPill").textContent(), "Live");
});

test("completion coalesces an in-flight note save and retries without duplicate notes", async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const html = renderSessionPage({
    id: "completion-race-session",
    status: "active",
    active_version: 2,
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 2, reps: 8 } }],
    events: [],
  });
  let releaseNote;
  const noteGate = new Promise((resolve) => { releaseNote = resolve; });
  let noteCalls = 0;
  let completeCalls = 0;
  const page = await browser.newPage();
  await page.route("**/*", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.resourceType() === "document") return route.fulfill({ status: 200, contentType: "text/html", body: html });
    if (path.endsWith("/events") && requestBody(request).type === "note_added") {
      noteCalls += 1;
      await noteGate;
      return route.fulfill({ status: 201, contentType: "application/json", body: "{}" });
    }
    if (path.endsWith("/complete")) {
      completeCalls += 1;
      return route.fulfill({
        status: completeCalls === 1 ? 500 : 200,
        contentType: "application/json",
        body: JSON.stringify(completeCalls === 1 ? { message: "Completion save failed" } : { status: "completed" }),
      });
    }
    if (path.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
  await page.goto("http://localhost/sessions/completion-race-session");
  await page.locator("#notes").fill("One durable note");
  await page.locator("#saveNote").click();
  await page.waitForFunction(() => document.querySelector("#saveNote")?.getAttribute("aria-busy") === "true");
  await page.locator("#complete").click();
  releaseNote();
  await page.waitForFunction(() => document.querySelector("#toast")?.textContent === "Completion save failed");
  assert.equal(noteCalls, 1);
  assert.equal(completeCalls, 1);
  await page.locator("#complete").click();
  await page.waitForFunction(() => document.querySelector("#statusPill")?.textContent === "Completed");
  assert.equal(noteCalls, 1);
  assert.equal(completeCalls, 2);
});

test("successful completion reloads into the server-rendered read-only state", async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  let completed = false;
  const session = {
    id: "reload-session",
    status: "active",
    active_version: 2,
    exercises: [
      { id: "ex-1", name: "Row", prescription: { sets: 2, reps: 8 } },
      { id: "ex-2", name: "Press", prescription: { sets: 2, reps: 8 } },
    ],
    events: [],
  };
  const page = await browser.newPage();
  await page.route("**/*", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.resourceType() === "document") {
      const html = renderSessionPage({ ...session, status: completed ? "completed" : "active", completed_at: completed ? "2026-10-04T10:30:00.000Z" : null });
      return route.fulfill({ status: 200, contentType: "text/html", body: html });
    }
    if (path.endsWith("/complete")) {
      completed = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "completed" }) });
    }
    if (path.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
  await page.goto("http://localhost/sessions/reload-session");
  const navigation = page.waitForNavigation();
  await page.locator("#complete").click();
  await navigation;
  assert.equal(await page.locator("#statusPill").textContent(), "Completed");
  assert.equal(await page.locator("[data-log-set]").count(), 0);
  assert.equal(await page.locator("[data-write-control]").count(), 0);
  assert.equal(await page.locator("#nextExercise").isDisabled(), false);
});

test("completed session keeps review navigation usable without write requests", async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const calls = [];
  const page = await openInterceptedPage(browser, renderSessionPage({
    id: "completed-session",
    status: "completed",
    active_version: 5,
    exercises: [
      { id: "ex-1", name: "Row", prescription: { sets: 2, reps: 8 } },
      { id: "ex-2", name: "Press", prescription: { sets: 2, reps: 8 } },
    ],
    events: [],
  }), calls);
  assert.equal(await page.locator("#nextExercise").isDisabled(), false);
  await page.locator("#nextExercise").click();
  assert.equal(await page.locator('[data-exercise-id="ex-2"]').evaluate((node) => node.classList.contains("is-active")), true);
  assert.equal(calls.length, 0);
});

test("live session browser runtime keeps write routes and structured payloads", async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());

  const startCalls = [];
  const plannedPage = await openInterceptedPage(browser, renderSessionPage({
    id: "runtime-session",
    status: "planned",
    active_version: 7,
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 3, reps: 10 } }],
    events: [],
  }), startCalls);
  await plannedPage.waitForFunction(() => document.querySelector("#statusPill")?.textContent === "Live");
  assert.deepEqual(startCalls[0], {
    path: "/api/sessions/runtime-session/start",
    body: { idempotency_key: "start:runtime-session" },
  });
  await plannedPage.close();

  const calls = [];
  const page = await openInterceptedPage(browser, renderSessionPage({
    id: "runtime-session",
    status: "active",
    active_version: 7,
    exercises: [
      { id: "ex-1", name: "Row", prescription: { sets: 3, reps: 10 } },
      { id: "ex-2", name: "Press", prescription: { sets: 2, reps: 8 } },
    ],
    events: [
      { id: "proposal-apply", type: "proposal_created", payload: { patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } } },
      { id: "proposal-reject", type: "proposal_created", payload: { patch: { type: "update_prescription", session_exercise_id: "ex-2", prescription: { reps: 10 } } } },
    ],
  }), calls);

  const card = page.locator('[data-exercise-id="ex-1"]');
  await card.locator("[data-reps]").fill("9");
  await card.locator("[data-load]").fill("52.5 kg");
  await card.locator("[data-exercise-note]").fill("Controlled tempo");
  const setRequest = await capturePost(page, (path, body) => path.endsWith("/events") && body.type === "set_logged", () => card.locator("[data-log-set]").click());
  await card.locator("[data-log-set]").waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector('[data-exercise-id="ex-1"] [data-log-set]')?.disabled);
  assert.deepEqual(setRequest, {
    path: "/api/sessions/runtime-session/events",
    body: {
      type: "set_logged",
      version: 7,
      payload: { session_exercise_id: "ex-1", load: "52.5 kg", reps: "9", note: "Controlled tempo", set_number: 1 },
      idempotency_key: "set:ex-1:1:7",
    },
  });

  await page.close();

  const actionCalls = [];
  const actionPage = await openInterceptedPage(browser, renderSessionPage({
    id: "runtime-session",
    status: "active",
    active_version: 7,
    exercises: [
      { id: "ex-1", name: "Row", prescription: { sets: 3, reps: 10 } },
      { id: "ex-2", name: "Press", prescription: { sets: 2, reps: 8 } },
    ],
    events: [
      { id: "proposal-apply", type: "proposal_created", payload: { patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } } },
      { id: "proposal-reject", type: "proposal_created", payload: { patch: { type: "update_prescription", session_exercise_id: "ex-2", prescription: { reps: 10 } } } },
    ],
  }), actionCalls);
  const actionCard = actionPage.locator('[data-exercise-id="ex-1"]');

  const doneRequest = await capturePost(actionPage, (path, body) => path.endsWith("/events") && body.type === "exercise_completion_updated", () => actionPage.locator('[data-context-index="0"] [data-done]').click());
  await actionPage.waitForFunction(() => !document.querySelector('[data-context-index="0"] [data-done]')?.disabled);
  assert.deepEqual(doneRequest.body.payload, { session_exercise_id: "ex-1", completed: true, completed_ids: ["ex-1"] });
  assert.equal(doneRequest.body.version, 7);

  const effortRequest = await capturePost(actionPage, (path, body) => path.endsWith("/events") && body.type === "effort_flag_logged", () => actionPage.locator('[data-effort="too_hard"]').click());
  assert.deepEqual(effortRequest.body.payload, { kind: "too_hard" });
  assert.equal(effortRequest.body.version, 7);

  await actionPage.locator("#notes").fill("Session note");
  const noteRequest = await capturePost(actionPage, (path, body) => path.endsWith("/events") && body.type === "note_added", () => actionPage.locator("#saveNote").click());
  assert.deepEqual(noteRequest.body.payload, { note: "Session note" });
  assert.equal(noteRequest.body.version, 7);

  const rejectRequest = await capturePost(actionPage, (path) => path.endsWith("/proposals/proposal-reject/reject"), () => actionPage.locator('[data-proposal-id="proposal-reject"] [data-reject-proposal]').click());
  assert.deepEqual(rejectRequest, {
    path: "/api/sessions/runtime-session/proposals/proposal-reject/reject",
    body: { reason: "Rejected from live session page" },
  });

  const applyRequest = await capturePost(actionPage, (path) => path.endsWith("/proposals/proposal-apply/apply"), () => actionPage.locator('[data-proposal-id="proposal-apply"] [data-apply-proposal]').click());
  assert.deepEqual(applyRequest, {
    path: "/api/sessions/runtime-session/proposals/proposal-apply/apply",
    body: { approved_by: "user" },
  });
  await actionPage.close();

  const completionCalls = [];
  const completionPage = await openInterceptedPage(browser, renderSessionPage({
    id: "runtime-session",
    status: "active",
    active_version: 7,
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 3, reps: 10 } }],
    events: [],
  }), completionCalls);
  await completionPage.locator("#notes").fill("Completion note");
  await capturePost(completionPage, (path, body) => path.endsWith("/events") && body.type === "note_added", () => completionPage.locator("#saveNote").click());
  const completeRequest = await capturePost(completionPage, (path) => path.endsWith("/complete"), () => completionPage.locator("#complete").click());
  assert.equal(completeRequest.path, "/api/sessions/runtime-session/complete");
  assert.deepEqual(completeRequest.body.completion.notes, "Completion note");
  assert.deepEqual(completeRequest.body.completion.completed_exercise_ids, []);
  assert.match(completeRequest.body.completion.completed_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(completionCalls.filter((call) => call.body?.type === "note_added").length, 1);
  await completionPage.waitForFunction(() => document.querySelector("#statusPill")?.textContent === "Completed");
  assert.equal(await completionPage.locator("[data-exercise-note]").isDisabled(), true);
  assert.equal(await completionPage.locator("#notes").isDisabled(), true);
  assert.equal(await completionPage.locator("#complete").isDisabled(), true);
  assert.equal(await completionPage.locator("#nextExercise").isDisabled(), true);
});
