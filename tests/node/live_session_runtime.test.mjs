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
  await plannedPage.waitForFunction(() => document.querySelector("#statusPill")?.textContent === "active");
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

  const doneRequest = await capturePost(actionPage, (path, body) => path.endsWith("/events") && body.type === "exercise_completion_updated", () => actionCard.locator("[data-done]").click());
  await actionPage.waitForFunction(() => !document.querySelector('[data-exercise-id="ex-1"] [data-done]')?.disabled);
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
  const completeRequest = await capturePost(completionPage, (path) => path.endsWith("/complete"), () => completionPage.locator("#complete").click());
  assert.equal(completeRequest.path, "/api/sessions/runtime-session/complete");
  assert.deepEqual(completeRequest.body.completion.notes, "Completion note");
  assert.deepEqual(completeRequest.body.completion.completed_exercise_ids, []);
  assert.match(completeRequest.body.completion.completed_at, /^\d{4}-\d{2}-\d{2}T/);
});
