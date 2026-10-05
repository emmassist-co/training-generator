import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryTrainingStore } from "../../src/db/training-store.mjs";
import { renderHomePage } from "../../src/routes/HomePage.tsx";
import { renderHistoryPage } from "../../src/routes/HistoryPage.tsx";
import { renderChatPage } from "../../src/routes/ChatPage.tsx";
import { renderSessionPage } from "../../src/routes/session-page.mjs";

test("home summary prefers active session, then planned session, for one profile", async () => {
  const store = createMemoryTrainingStore();
  await store.upsertProfile({ id: "alex", profile: { name: "Alex" } });
  await store.createSession({ id: "old", profile_id: "alex", status: "completed", title: "Old", planned_at: "2026-01-01", completed_at: "2026-01-01" });
  await store.createSession({ id: "planned", profile_id: "alex", status: "planned", title: "Planned", planned_at: "2026-02-01" });

  let home = await store.getHomeSummary({ profileId: "alex" });
  assert.equal(home.active_session.id, "planned");
  assert.equal(home.today_recommendation.kind, "resume");

  await store.createSession({ id: "active", profile_id: "alex", status: "active", title: "Active", planned_at: "2026-01-15" });
  home = await store.getHomeSummary({ profileId: "alex" });
  assert.equal(home.active_session.id, "active");
  assert.deepEqual(home.recent_sessions.map((session) => session.id), ["planned", "active", "old"]);
});

test("session live state replays completion notes effort and set logs", async () => {
  const store = createMemoryTrainingStore();
  await store.createSession({ id: "live", title: "Live", exercises: [{ id: "ex-1", name: "Row" }] });
  await store.logSessionEvent({ session_id: "live", type: "exercise_completion_updated", payload: { session_exercise_id: "ex-1", completed: true } });
  await store.logSessionEvent({ session_id: "live", type: "note_added", payload: { note: "Felt good." } });
  await store.logSessionEvent({ session_id: "live", type: "effort_flag_logged", payload: { kind: "too_hard" } });
  await store.logSessionEvent({ session_id: "live", type: "set_logged", payload: { session_exercise_id: "ex-1", load: "50", reps: "10" } });

  const state = await store.getSessionLiveState("live");
  assert.deepEqual(state.completed_exercise_ids, ["ex-1"]);
  assert.equal(state.notes[0].text, "Felt good.");
  assert.equal(state.effort_flags[0].kind, "too_hard");
  assert.equal(state.set_logs[0].load, "50");
});

test("profile learning proposal changes context only after apply", async () => {
  const store = createMemoryTrainingStore();
  await store.upsertProfile({ id: "alex", profile: { name: "Alex" }, planning_feedback_profile: { summary_notes: [], signals: [] } });
  const proposal = await store.proposeProfileUpdate({ profile_id: "alex", proposal_id: "learn-1", patch: { summary_note: "Prefers shorter finishers." } });
  assert.equal(proposal.status, "pending");
  let context = await store.getTrainingContext({ profileId: "alex" });
  assert.deepEqual(context.planning_feedback_profile.summary_notes, []);

  await store.applyProfileUpdate({ profile_id: "alex", proposal_id: "learn-1" });
  context = await store.getTrainingContext({ profileId: "alex" });
  assert.deepEqual(context.planning_feedback_profile.summary_notes, ["Prefers shorter finishers."]);
});

test("hosted pages share the Flue editorial product system", () => {
  const chat = renderChatPage();
  const pages = [renderHomePage(), renderHistoryPage(), chat];
  assert.doesNotMatch(chat, /Enter for newline/);
  for (const html of pages) {
    assert.match(html, /aria-label="Flue"/);
    assert.match(html, /Barlow Condensed/);
    assert.match(html, /--accent:\s*#d9ff5a/);
    assert.match(html, /--ground:\s*#10120f/);
    assert.doesNotMatch(html, /radial-gradient|backdrop-filter|box-shadow:\s*0 24px/i);
  }
});

test("hosted pages render home history, D1 replay, and pending proposals", () => {
  assert.match(renderHomePage(), /Training home/);
  assert.match(renderHistoryPage(), /History/);
  const html = renderSessionPage({
    id: "s1",
    profile_id: "alex",
    title: "Replay",
    status: "active",
    active_version: 1,
    exercises: [{
      id: "ex-1",
      exercise_id: "Cable_Row",
      name: "Row",
      prescription: { sets: 3, reps: 10, load: "50 kg", rest_seconds: 75 },
      images: ["Cable_Row/0.jpg"],
      equipment: "cable",
    }],
    events: [
      { id: "e1", type: "exercise_completion_updated", payload: { session_exercise_id: "ex-1", completed: true }, created_at: "2026-01-01" },
      { id: "p1", type: "proposal_created", reason: "Machine busy", payload: { patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } }, created_at: "2026-01-01" },
    ],
  });
  assert.match(html, /exercise photo/);
  assert.match(html, /metric-strip/);
  assert.doesNotMatch(html, /metric-card/);
  assert.match(html, /Log set/);
  assert.match(html, /Current set/);
  assert.match(html, /Set 1 of 3/);
  assert.doesNotMatch(html, /Reps done counter/);
  assert.doesNotMatch(html, /Load used counter/);
  assert.match(html, />Rest /);
  assert.match(html, /Mark movement done/);
  assert.match(html, /Ask coach/);
  assert.match(html, /Pending coach changes/);
  assert.match(html, /Apply change/);

  const completedHtml = renderSessionPage({
    id: "s2",
    profile_id: "alex",
    title: "Completed",
    status: "completed",
    active_version: 1,
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 3, reps: 10 } }],
    events: [],
  });
  const completedMarkup = completedHtml.slice(completedHtml.indexOf("<body>"), completedHtml.indexOf('<script type="module">'));
  assert.doesNotMatch(completedMarkup, /data-log-set/);
  assert.doesNotMatch(completedMarkup, /data-done/);
  assert.match(completedMarkup, /id="nextExercise"/);
  assert.doesNotMatch(completedMarkup, /id="nextExercise" disabled/);
});
