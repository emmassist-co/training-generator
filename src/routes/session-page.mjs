import { deriveSessionLiveState } from "../db/training-store.mjs";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function prescriptionText(prescription = {}) {
  const parts = [];
  if (prescription.sets) parts.push(`${prescription.sets} sets`);
  if (prescription.reps) parts.push(`${prescription.reps} reps`);
  if (prescription.duration) parts.push(String(prescription.duration));
  if (prescription.load) parts.push(String(prescription.load));
  if (prescription.rest_seconds) parts.push(`${prescription.rest_seconds}s rest`);
  else if (prescription.rest) parts.push(String(prescription.rest));
  return parts.join(" · ") || "As prescribed";
}

export function renderSessionPage(session) {
  const exercises = session.exercises || [];
  const title = session.title || "Training Session";
  const liveState = deriveSessionLiveState(session);
  const completed = new Set(liveState.completed_exercise_ids || []);
  const latestNote = liveState.notes?.at(-1)?.text || "";
  const isCompleted = session.status === "completed";
  const resolvedProposalIds = new Set((session.events || [])
    .filter((event) => event.type === "proposal_accepted" || event.type === "proposal_rejected")
    .map((event) => event.payload?.proposal_id)
    .filter(Boolean));
  const pendingProposals = (session.events || [])
    .filter((event) => event.type === "proposal_created" && !resolvedProposalIds.has(event.id))
    .map((event) => ({ id: event.id, reason: event.reason, patch: event.payload?.patch || null }));
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; --bg:#07090b; --panel:rgba(15,20,22,.9); --line:rgba(213,255,234,.13); --text:#f5f7f6; --muted:#91a09c; --muted2:#66736f; --accent:#8ee7c8; --accent2:#d5fff0; --danger:#ffb4a8; --warn:#ffd28a; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100dvh; color:var(--text); font:15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 18% 0%, rgba(142,231,200,.18), transparent 34rem), linear-gradient(180deg,#0b1110,var(--bg)); }
    main { width:min(920px,100%); margin:0 auto; padding:14px; }
    a { color:inherit; }
    header, .exercise, .panel { border:1px solid var(--line); background:var(--panel); border-radius:28px; box-shadow:0 24px 90px rgba(0,0,0,.36); backdrop-filter:blur(20px); }
    header { padding:18px; margin-bottom:12px; }
    .topline { display:flex; justify-content:space-between; gap:12px; align-items:center; }
    .eyebrow { color:var(--accent); font-size:11px; font-weight:850; letter-spacing:.16em; text-transform:uppercase; }
    h1 { margin:5px 0 8px; font-size:clamp(34px,8vw,72px); letter-spacing:-.07em; line-height:.88; }
    .summary { color:var(--muted); max-width:64rem; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
    .pill { border:1px solid var(--line); border-radius:999px; padding:7px 10px; color:var(--accent2); background:rgba(142,231,200,.05); font-size:13px; font-weight:750; }
    .list { display:grid; gap:12px; }
    .exercise { padding:14px; display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:start; }
    input[type="checkbox"] { width:28px; height:28px; accent-color:var(--accent); margin-top:4px; }
    h2 { margin:0; font-size:20px; letter-spacing:-.02em; }
    .rx { margin-top:5px; color:var(--accent2); font-weight:800; }
    .why { margin-top:8px; color:var(--muted); }
    details { margin-top:10px; color:var(--muted); }
    summary { cursor:pointer; color:var(--text); }
    .panel { padding:14px; margin-top:12px; }
    textarea, input.set-input { width:100%; border:1px solid var(--line); border-radius:18px; background:rgba(0,0,0,.22); color:var(--text); font:inherit; padding:12px; outline:none; }
    textarea { min-height:110px; resize:vertical; }
    .set-row { display:grid; grid-template-columns:1fr 1fr auto; gap:8px; margin-top:12px; }
    .proposal { margin-top:12px; padding:12px; border:1px solid var(--line); border-radius:18px; background:rgba(142,231,200,.05); }
    .proposal p { margin:0 0 8px; color:var(--accent2); font-weight:800; }
    .proposal pre { white-space:pre-wrap; overflow:auto; color:var(--muted); font-size:12px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin-top:10px; color:var(--muted2); font-size:12px; }
    .button-row { display:flex; flex-wrap:wrap; gap:8px; }
    button, .coach-link { border:0; border-radius:16px; min-height:44px; padding:0 16px; background:linear-gradient(180deg,var(--accent2),var(--accent)); color:#031b14; font:inherit; font-weight:900; cursor:pointer; display:inline-flex; align-items:center; text-decoration:none; }
    button.secondary, .coach-link { background:rgba(255,255,255,.06); color:var(--text); border:1px solid var(--line); }
    button.danger { background:rgba(255,180,168,.13); color:var(--danger); border:1px solid rgba(255,180,168,.25); }
    .done { opacity:.55; }
    .toast { min-height:18px; color:var(--accent); }
    .readonly { color:var(--warn); }
    @media (max-width:640px) { main { padding:8px; } header, .exercise, .panel { border-radius:22px; } .exercise { grid-template-columns:1fr; } .set-row { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="topline"><div class="eyebrow">Live training session</div><a class="coach-link" href="/chat?profile_id=${encodeURIComponent(session.profile_id || "default")}&session_id=${encodeURIComponent(session.id)}">Ask coach</a></div>
      <h1>${escapeHtml(title)}</h1>
      <div class="summary">${escapeHtml(session.summary || "Tick off work, add notes, and finish the session here. Updates save to D1 so the coach can read them while you train.")}</div>
      <div class="meta">
        <span class="pill">${escapeHtml(session.profile_id || "default")}</span>
        <span class="pill" id="statusPill">${escapeHtml(session.status || "planned")}</span>
        <span class="pill">${exercises.length} exercises</span>
        ${isCompleted ? `<span class="pill readonly">completed sessions are read-only</span>` : ""}
      </div>
    </header>

    <section class="list" id="list">
      ${exercises.map((exercise, index) => `<article class="exercise ${completed.has(exercise.id) ? "done" : ""}" data-exercise-id="${escapeHtml(exercise.id)}">
        <input type="checkbox" aria-label="Complete ${escapeHtml(exercise.name)}" ${completed.has(exercise.id) ? "checked" : ""} ${isCompleted ? "disabled" : ""} />
        <div>
          <h2>${index + 1}. ${escapeHtml(exercise.name)}</h2>
          <div class="rx">${escapeHtml(prescriptionText(exercise.prescription))}</div>
          ${exercise.rationale ? `<div class="why">${escapeHtml(exercise.rationale)}</div>` : ""}
          ${exercise.alternatives?.length ? `<details><summary>Alternatives</summary><ul>${exercise.alternatives.map((alt) => `<li>${escapeHtml(alt.name || alt)}</li>`).join("")}</ul></details>` : ""}
          ${isCompleted ? "" : `<div class="set-row"><input class="set-input" data-load placeholder="Load used"/><input class="set-input" data-reps placeholder="Reps done"/><button class="secondary" type="button" data-log-set>Log set</button></div>`}
        </div>
      </article>`).join("")}
    </section>

    ${pendingProposals.length ? `<section class="panel" id="proposalPanel"><strong>Pending coach changes</strong>${pendingProposals.map((proposal) => `<article class="proposal" data-proposal-id="${escapeHtml(proposal.id)}"><p>${escapeHtml(proposal.reason || "Review this proposed session change.")}</p><pre>${escapeHtml(JSON.stringify(proposal.patch, null, 2))}</pre>${isCompleted ? "" : `<div class="button-row"><button type="button" data-apply-proposal>Apply change</button><button type="button" class="secondary" data-reject-proposal>Reject</button></div>`}</article>`).join("")}</section>` : ""}

    <section class="panel">
      <label for="notes"><strong>Session notes</strong></label>
      <textarea id="notes" placeholder="Pain, machine swaps, loads used, how it felt…" ${isCompleted ? "readonly" : ""}>${escapeHtml(latestNote)}</textarea>
      <div class="actions">
        <span class="toast" id="toast">Ready</span>
        <div class="button-row">
          ${isCompleted ? "" : `<button type="button" class="secondary" data-effort="too_easy">Too easy</button><button type="button" class="secondary" data-effort="too_hard">Too hard</button><button type="button" class="danger" data-effort="pain">Pain</button><button type="button" class="secondary" id="saveNote">Save note</button><button type="button" id="complete">Complete session</button>`}
        </div>
      </div>
    </section>
  </main>

  <script type="module">
    const session = ${scriptJson({ id: session.id, active_version: session.active_version, status: session.status, completed_exercise_ids: liveState.completed_exercise_ids })};
    const toast = document.querySelector('#toast');
    const notes = document.querySelector('#notes');
    const complete = document.querySelector('#complete');
    const saveNote = document.querySelector('#saveNote');
    const checked = new Set(session.completed_exercise_ids || []);

    function setReadOnlyAfterComplete() {
      for (const control of document.querySelectorAll('input, textarea, button')) control.disabled = true;
      notes.readOnly = true;
      document.querySelector('#statusPill').textContent = 'completed';
    }

    function apiUrl(path) { const url = new URL(path, location.href); url.username = ''; url.password = ''; return url.href; }
    function setToast(text) { toast.textContent = text; }
    async function postJson(path, body, init = {}) {
      const response = await fetch(apiUrl(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...init });
      if (!response.ok) throw new Error('Save failed');
      return response.json();
    }
    async function postEvent(type, payload) {
      setToast('Saving…');
      const event = await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/events', { type, version: session.active_version, payload, idempotency_key: type + ':' + crypto.randomUUID() });
      setToast('Saved');
      return event;
    }
    async function startSession() {
      if (session.status !== 'planned') return;
      try {
        await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/start', { idempotency_key: 'start:' + session.id });
        document.querySelector('#statusPill').textContent = 'active';
        session.status = 'active';
      } catch (error) { setToast(error.message); }
    }
    startSession();

    for (const card of document.querySelectorAll('.exercise')) {
      const id = card.dataset.exerciseId;
      const box = card.querySelector('input[type="checkbox"]');
      box?.addEventListener('change', async () => {
        card.classList.toggle('done', box.checked);
        if (box.checked) checked.add(id); else checked.delete(id);
        try { await postEvent('exercise_completion_updated', { session_exercise_id: id, completed: box.checked, completed_ids: [...checked] }); }
        catch (error) { setToast(error.message); }
      });
      card.querySelector('[data-log-set]')?.addEventListener('click', async () => {
        const load = card.querySelector('[data-load]')?.value.trim();
        const reps = card.querySelector('[data-reps]')?.value.trim();
        try { await postEvent('set_logged', { session_exercise_id: id, load, reps }); }
        catch (error) { setToast(error.message); }
      });
    }

    async function saveNotes() { const text = notes.value.trim(); if (!text) return; await postEvent('note_added', { note: text }); }
    saveNote?.addEventListener('click', () => saveNotes().catch((error) => setToast(error.message)));
    for (const button of document.querySelectorAll('[data-effort]')) {
      button.addEventListener('click', () => postEvent('effort_flag_logged', { kind: button.dataset.effort }).catch((error) => setToast(error.message)));
    }
    for (const proposal of document.querySelectorAll('[data-proposal-id]')) {
      const proposalId = proposal.dataset.proposalId;
      proposal.querySelector('[data-apply-proposal]')?.addEventListener('click', async () => {
        setToast('Applying proposal…');
        try { await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/proposals/' + encodeURIComponent(proposalId) + '/apply', { approved_by: 'user' }); location.reload(); }
        catch (error) { setToast(error.message); }
      });
      proposal.querySelector('[data-reject-proposal]')?.addEventListener('click', async () => {
        setToast('Rejecting proposal…');
        try { await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/proposals/' + encodeURIComponent(proposalId) + '/reject', { reason: 'Rejected from live session page' }); proposal.remove(); setToast('Proposal rejected'); }
        catch (error) { setToast(error.message); }
      });
    }
    complete?.addEventListener('click', async () => {
      setToast('Completing…');
      try {
        await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/complete', { completion: { completed_at: new Date().toISOString(), notes: notes.value.trim(), completed_exercise_ids: [...checked] } });
        setToast('Completed and logged');
        setReadOnlyAfterComplete();
      } catch (error) { setToast(error.message); }
    });
  </script>
</body>
</html>`;
}
