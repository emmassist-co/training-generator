import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryTrainingStore } from "../../src/db/training-store.mjs";
import { renderHomePage } from "../../src/routes/home-page.mjs";
import { renderHistoryPage } from "../../src/routes/history-page.mjs";
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
  assert.match(html, /metric-card/);
  assert.match(html, /Log this set/);
  assert.match(html, /Reps done counter/);
  assert.match(html, /Load used counter/);
  assert.match(html, /Rest timer/);
  assert.match(html, /Done \+ next/);
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
  assert.match(completedHtml, /id="bottomAddSet" disabled/);
  assert.match(completedHtml, /id="bottomDone" disabled/);
});
