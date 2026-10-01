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
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; --bg:#07090b; --panel:rgba(15,20,22,.9); --line:rgba(213,255,234,.13); --text:#f5f7f6; --muted:#91a09c; --muted2:#66736f; --accent:#8ee7c8; --accent2:#d5fff0; --danger:#ffb4a8; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100dvh; color:var(--text); font:15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 18% 0%, rgba(142,231,200,.18), transparent 34rem), linear-gradient(180deg,#0b1110,var(--bg)); }
    main { width:min(920px,100%); margin:0 auto; padding:14px; }
    header, .exercise, .panel { border:1px solid var(--line); background:var(--panel); border-radius:28px; box-shadow:0 24px 90px rgba(0,0,0,.36); backdrop-filter:blur(20px); }
    header { padding:18px; margin-bottom:12px; }
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
    textarea { width:100%; min-height:110px; resize:vertical; border:1px solid var(--line); border-radius:18px; background:rgba(0,0,0,.22); color:var(--text); font:inherit; padding:12px; outline:none; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin-top:10px; color:var(--muted2); font-size:12px; }
    button { border:0; border-radius:16px; min-height:44px; padding:0 16px; background:linear-gradient(180deg,var(--accent2),var(--accent)); color:#031b14; font:inherit; font-weight:900; cursor:pointer; }
    button.secondary { background:rgba(255,255,255,.06); color:var(--text); border:1px solid var(--line); }
    .done { opacity:.55; }
    .toast { min-height:18px; color:var(--accent); }
    @media (max-width:640px) { main { padding:8px; } header, .exercise, .panel { border-radius:22px; } .exercise { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="eyebrow">Live training session</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="summary">${escapeHtml(session.summary || "Tick off sets, add notes, and finish the session here. Updates save to D1 so the coach can read them while you train.")}</div>
      <div class="meta">
        <span class="pill">${escapeHtml(session.profile_id || "default")}</span>
        <span class="pill">${escapeHtml(session.status || "planned")}</span>
        <span class="pill">${exercises.length} exercises</span>
      </div>
    </header>

    <section class="list" id="list">
      ${exercises.map((exercise, index) => `<article class="exercise" data-exercise-id="${escapeHtml(exercise.id)}">
        <input type="checkbox" aria-label="Complete ${escapeHtml(exercise.name)}" />
        <div>
          <h2>${index + 1}. ${escapeHtml(exercise.name)}</h2>
          <div class="rx">${escapeHtml(prescriptionText(exercise.prescription))}</div>
          ${exercise.rationale ? `<div class="why">${escapeHtml(exercise.rationale)}</div>` : ""}
          ${exercise.alternatives?.length ? `<details><summary>Alternatives</summary><ul>${exercise.alternatives.map((alt) => `<li>${escapeHtml(alt.name || alt)}</li>`).join("")}</ul></details>` : ""}
        </div>
      </article>`).join("")}
    </section>

    <section class="panel">
      <label for="notes"><strong>Session notes</strong></label>
      <textarea id="notes" placeholder="Pain, machine swaps, loads used, how it felt…"></textarea>
      <div class="actions">
        <span class="toast" id="toast">Ready</span>
        <div>
          <button type="button" class="secondary" id="saveNote">Save note</button>
          <button type="button" id="complete">Complete session</button>
        </div>
      </div>
    </section>
  </main>

  <script type="module">
    const session = ${scriptJson({ id: session.id, active_version: session.active_version })};
    const toast = document.querySelector('#toast');
    const notes = document.querySelector('#notes');
    const complete = document.querySelector('#complete');
    const saveNote = document.querySelector('#saveNote');
    const checked = new Set(JSON.parse(localStorage.getItem('trainingSessionDone:' + session.id) || '[]'));

    function apiUrl(path) {
      const url = new URL(path, location.href);
      url.username = '';
      url.password = '';
      return url.href;
    }

    function setToast(text) { toast.textContent = text; }
    async function postEvent(type, payload) {
      setToast('Saving…');
      const response = await fetch(apiUrl('/api/sessions/' + encodeURIComponent(session.id) + '/events'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, version: session.active_version, payload, idempotency_key: type + ':' + crypto.randomUUID() }),
      });
      if (!response.ok) throw new Error('Save failed');
      setToast('Saved');
    }

    for (const card of document.querySelectorAll('.exercise')) {
      const id = card.dataset.exerciseId;
      const box = card.querySelector('input');
      box.checked = checked.has(id);
      card.classList.toggle('done', box.checked);
      box.addEventListener('change', async () => {
        card.classList.toggle('done', box.checked);
        if (box.checked) checked.add(id); else checked.delete(id);
        localStorage.setItem('trainingSessionDone:' + session.id, JSON.stringify([...checked]));
        try { await postEvent('exercise_completion_updated', { session_exercise_id: id, completed: box.checked, completed_ids: [...checked] }); }
        catch (error) { setToast(error.message); }
      });
    }

    async function saveNotes() {
      const text = notes.value.trim();
      if (!text) return;
      await postEvent('note_added', { note: text });
    }
    saveNote.addEventListener('click', () => saveNotes().catch((error) => setToast(error.message)));
    notes.addEventListener('change', () => saveNotes().catch((error) => setToast(error.message)));
    complete.addEventListener('click', async () => {
      setToast('Completing…');
      const response = await fetch(apiUrl('/api/sessions/' + encodeURIComponent(session.id) + '/complete'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completion: { completed_at: new Date().toISOString(), notes: notes.value.trim(), completed_exercise_ids: [...checked] } }),
      });
      if (!response.ok) { setToast('Complete failed'); return; }
      setToast('Completed and logged');
      complete.disabled = true;
    });
  </script>
</body>
</html>`;
}
