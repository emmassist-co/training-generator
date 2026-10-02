import { deriveSessionLiveState } from "../db/training-store.mjs";

const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

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

function prescriptionMetricItems(prescription = {}) {
  const metrics = [];
  if (prescription.sets) metrics.push({ key: "sets", label: "Sets", value: prescription.sets, icon: "↻" });
  if (prescription.reps) metrics.push({ key: "reps", label: "Reps", value: prescription.reps, icon: "#" });
  if (prescription.load) metrics.push({ key: "load", label: "Load", value: prescription.load, icon: "◆" });
  if (prescription.duration) metrics.push({ key: "time", label: "Time", value: prescription.duration, icon: "◷" });
  if (prescription.rest_seconds) metrics.push({ key: "rest", label: "Rest", value: `${prescription.rest_seconds}s`, icon: "⌁" });
  else if (prescription.rest) metrics.push({ key: "rest", label: "Rest", value: prescription.rest, icon: "⌁" });
  return metrics;
}

function firstExerciseImage(exercise = {}) {
  const image = exercise.images?.[0];
  if (image) return image.startsWith("http") ? image : `${EXERCISE_IMAGE_BASE}${encodeURI(image)}`;
  if (exercise.exercise_id) return `${EXERCISE_IMAGE_BASE}${encodeURIComponent(exercise.exercise_id)}/0.jpg`;
  return null;
}

function renderMetrics(exercise) {
  const metrics = prescriptionMetricItems(exercise.prescription);
  if (!metrics.length) return `<div class="metric-strip empty">Prescription details unavailable</div>`;
  return `<div class="metric-strip">${metrics.map((metric) => `<div class="metric-card" data-metric="${escapeHtml(metric.key)}"><span class="metric-icon" aria-hidden="true">${escapeHtml(metric.icon)}</span><span class="metric-label">${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></div>`).join("")}</div>`;
}

function renderExerciseMedia(exercise) {
  const image = firstExerciseImage(exercise);
  const name = exercise.name || "Exercise";
  if (!image) {
    return `<div class="exercise-media fallback" role="img" aria-label="${escapeHtml(name)} illustration"><span aria-hidden="true">${escapeHtml((name[0] || "T").toUpperCase())}</span></div>`;
  }
  return `<figure class="exercise-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(name)} exercise photo" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').classList.add('fallback'); this.remove();"><span class="fallback-letter" aria-hidden="true">${escapeHtml((name[0] || "T").toUpperCase())}</span><figcaption>${escapeHtml(exercise.equipment || exercise.category || "Exercise demo")}</figcaption></figure>`;
}

function renderAlternatives(exercise) {
  if (!exercise.alternatives?.length) return "";
  return `<details class="alternatives"><summary>Swap ideas</summary><ul>${exercise.alternatives.map((alt) => `<li>${escapeHtml(alt.name || alt)}</li>`).join("")}</ul></details>`;
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
    :root { color-scheme: dark; --bg:#050706; --panel:rgba(13,18,17,.92); --panel2:rgba(255,255,255,.055); --line:rgba(213,255,234,.14); --text:#f6faf8; --muted:#9aa9a4; --muted2:#66736f; --accent:#8dffcb; --accent2:#d9fff1; --danger:#ffb4a8; --warn:#ffd28a; --shadow:0 24px 90px rgba(0,0,0,.42); }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100dvh; color:var(--text); font:15px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:radial-gradient(circle at 18% -10%, rgba(141,255,203,.18), transparent 34rem), radial-gradient(circle at 100% 8%, rgba(255,210,138,.10), transparent 26rem), linear-gradient(180deg,#0b1110,var(--bg)); }
    button, input, textarea { font:inherit; }
    button { touch-action:manipulation; }
    main { width:min(980px,100%); margin:0 auto; padding:12px 12px 118px; }
    a { color:inherit; }
    .hero, .exercise-card, .panel, .coach-drawer { border:1px solid var(--line); background:var(--panel); border-radius:30px; box-shadow:var(--shadow); backdrop-filter:blur(20px); }
    .hero { padding:12px 14px; margin-bottom:10px; border-radius:24px; box-shadow:0 14px 54px rgba(0,0,0,.28); }
    .topline, .hero-actions, .session-stats, .progress-row, .button-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .topline { justify-content:space-between; }
    .eyebrow { color:var(--accent); font-size:11px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
    h1 { margin:6px 0 0; color:var(--muted); font-size:15px; letter-spacing:-.01em; line-height:1.2; font-weight:800; }
    .summary { display:none; color:var(--muted); max-width:62rem; }
    .pill { border:1px solid var(--line); border-radius:999px; padding:7px 10px; color:var(--accent2); background:rgba(141,255,203,.06); font-size:13px; font-weight:800; }
    .readonly { color:var(--warn); }
    .coach-link, button { border:0; border-radius:18px; min-height:46px; padding:0 16px; background:linear-gradient(180deg,var(--accent2),var(--accent)); color:#031b14; font-weight:950; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-decoration:none; transition:transform .14s ease, opacity .14s ease, background .14s ease; }
    button:active, .coach-link:active { transform:scale(.96); }
    button.secondary, .coach-link { background:rgba(255,255,255,.065); color:var(--text); border:1px solid var(--line); }
    button.ghost { background:transparent; color:var(--muted); border:1px solid var(--line); }
    button.danger { background:rgba(255,180,168,.13); color:var(--danger); border:1px solid rgba(255,180,168,.28); }
    button:disabled, input:disabled, textarea:disabled { opacity:.5; cursor:not-allowed; }
    .session-stats { margin-top:10px; }
    .progress-shell { margin-top:12px; }
    .progress-row { justify-content:space-between; color:var(--muted); font-size:13px; font-weight:800; }
    .progress-track { height:10px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; margin-top:8px; }
    .progress-fill { height:100%; width:0%; background:linear-gradient(90deg,var(--accent),var(--warn)); border-radius:inherit; transition:width .2s ease; }
    .exercise-stage { display:grid; gap:12px; }
    .exercise-card { overflow:hidden; display:none; }
    .exercise-card.is-active { display:block; }
    .media-grid { display:grid; grid-template-columns:minmax(0, 1.15fr) minmax(280px, .85fr); min-height:360px; }
    .exercise-copy { padding:20px; display:flex; flex-direction:column; gap:14px; }
    .exercise-kicker { color:var(--accent); font-size:12px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; }
    h2 { margin:0; font-size:clamp(46px,12vw,82px); letter-spacing:-.075em; line-height:.84; }
    .rx { color:var(--accent2); font-size:20px; font-weight:950; }
    .why { color:var(--muted); }
    .exercise-media { position:relative; min-height:100%; margin:0; background:linear-gradient(135deg,rgba(141,255,203,.14),rgba(255,255,255,.04)); overflow:hidden; display:flex; align-items:stretch; justify-content:center; }
    .exercise-media img { width:100%; height:100%; object-fit:cover; filter:saturate(.92) contrast(1.04); }
    .exercise-media figcaption { position:absolute; left:14px; bottom:14px; border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.48); color:var(--accent2); border-radius:999px; padding:7px 10px; font-size:12px; font-weight:900; backdrop-filter:blur(10px); }
    .exercise-media.fallback { min-height:280px; align-items:center; background:radial-gradient(circle at 50% 32%,rgba(141,255,203,.22),transparent 12rem),linear-gradient(135deg,rgba(141,255,203,.12),rgba(255,255,255,.04)); }
    .exercise-media:not(.fallback) .fallback-letter { display:none; }
    .exercise-media.fallback .fallback-letter, .exercise-media.fallback span { width:112px; height:112px; display:grid; place-items:center; border-radius:34px; color:#07120f; background:linear-gradient(180deg,var(--accent2),var(--accent)); font-size:64px; font-weight:1000; box-shadow:0 22px 70px rgba(141,255,203,.18); }
    .metric-strip { display:grid; grid-template-columns:repeat(auto-fit,minmax(104px,1fr)); gap:8px; }
    .metric-card { display:grid; grid-template-columns:auto 1fr; grid-template-areas:"icon label" "icon value"; gap:1px 9px; align-items:center; border:1px solid var(--line); border-radius:20px; padding:11px; background:var(--panel2); }
    .metric-icon { grid-area:icon; width:32px; height:32px; border-radius:11px; display:grid; place-items:center; background:rgba(141,255,203,.12); color:var(--accent); font-weight:950; }
    .metric-label { grid-area:label; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.12em; font-weight:850; }
    .metric-card strong { grid-area:value; font-size:17px; line-height:1.05; }
    .metric-strip.empty { color:var(--muted); border:1px solid var(--line); border-radius:20px; padding:12px; }
    .set-console { border:1px solid var(--line); border-radius:26px; padding:14px; background:rgba(0,0,0,.20); display:grid; gap:12px; }
    .set-header, .timer-row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
    .set-header strong { font-size:20px; letter-spacing:-.035em; }
    .set-help { color:var(--muted); font-size:13px; margin-top:2px; }
    .set-count { color:var(--accent); font-weight:950; }
    .set-counters { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .counter-wrap { display:grid; gap:6px; }
    .counter-label { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.12em; font-weight:900; }
    .counter-group { display:grid; grid-template-columns:auto 1fr auto; align-items:center; border:1px solid var(--line); border-radius:18px; overflow:hidden; background:rgba(255,255,255,.04); min-width:0; }
    .counter-group button { min-height:42px; border-radius:0; padding:0 13px; background:transparent; color:var(--text); border:0; }
    .counter-value { text-align:center; font-size:22px; font-weight:1000; min-width:50px; letter-spacing:-.04em; }
    .field-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .field { display:grid; gap:5px; color:var(--muted); font-size:12px; font-weight:850; text-transform:uppercase; letter-spacing:.08em; }
    input.set-input, textarea.exercise-note, textarea.session-note { width:100%; border:1px solid var(--line); border-radius:18px; background:rgba(0,0,0,.24); color:var(--text); padding:12px; outline:none; }
    textarea.exercise-note { min-height:78px; resize:vertical; text-transform:none; letter-spacing:0; font-weight:500; }
    .timer-time { font-size:28px; font-weight:1000; letter-spacing:-.04em; color:var(--accent2); }
    .alternatives { color:var(--muted); }
    .alternatives summary { cursor:pointer; color:var(--accent2); font-weight:850; }
    .panel { padding:14px; margin-top:12px; }
    .proposal { margin-top:12px; padding:12px; border:1px solid var(--line); border-radius:18px; background:rgba(141,255,203,.05); }
    .proposal p { margin:0 0 8px; color:var(--accent2); font-weight:800; }
    .proposal pre { white-space:pre-wrap; overflow:auto; color:var(--muted); font-size:12px; }
    textarea.session-note { min-height:104px; resize:vertical; margin-top:8px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin-top:10px; color:var(--muted2); font-size:12px; }
    .toast { min-height:18px; color:var(--accent); font-weight:850; }
    .bottom-bar { position:fixed; left:50%; bottom:10px; transform:translateX(-50%); width:min(980px,calc(100% - 16px)); display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; border:1px solid var(--line); border-radius:28px; padding:8px; background:rgba(5,7,6,.86); box-shadow:0 18px 80px rgba(0,0,0,.5); backdrop-filter:blur(22px); z-index:10; }
    .bottom-title { min-width:0; }
    .bottom-title strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .bottom-title span { color:var(--muted); font-size:12px; font-weight:750; }
    .bottom-actions { display:flex; gap:8px; justify-content:flex-end; }
    @media (max-width:760px) { main { padding:8px 8px 88px; } .hero, .exercise-card, .panel { border-radius:24px; } .media-grid { grid-template-columns:1fr; min-height:0; } .exercise-media { min-height:210px; } .exercise-copy { padding:16px; } .set-counters, .field-grid { grid-template-columns:1fr; } .bottom-bar { grid-template-columns:76px 1fr; border-radius:22px; padding:7px; } .bottom-title { display:none; } .bottom-actions { display:grid; grid-template-columns:.85fr 1fr 1.25fr; } .bottom-actions button, #prevExercise { min-height:48px; padding:0 9px; border-radius:16px; } }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <div class="topline"><div class="eyebrow">Live training session</div><div class="hero-actions"><a class="coach-link" href="/chat?profile_id=${encodeURIComponent(session.profile_id || "default")}&session_id=${encodeURIComponent(session.id)}">Ask coach</a></div></div>
      <h1>${escapeHtml(title)}</h1>
      <div class="summary">${escapeHtml(session.summary || "Train from one focused exercise card. Reps, load, timer, notes, and coach-readable logs save while you work.")}</div>
      <div class="session-stats">
        <span class="pill">${escapeHtml(session.profile_id || "default")}</span>
        <span class="pill" id="statusPill">${escapeHtml(session.status || "planned")}</span>
        <span class="pill"><span id="completedCount">${completed.size}</span>/${exercises.length} done</span>
        <span class="pill" id="elapsedPill">00:00 elapsed</span>
        ${isCompleted ? `<span class="pill readonly">completed sessions are read-only</span>` : ""}
      </div>
      <div class="progress-shell"><div class="progress-row"><span id="progressLabel">Exercise 1 of ${exercises.length || 1}</span><span id="progressPercent">0%</span></div><div class="progress-track"><div class="progress-fill" id="progressFill"></div></div></div>
    </header>

    <section class="exercise-stage" id="exerciseStage" aria-live="polite">
      ${exercises.map((exercise, index) => {
        const loggedSets = liveState.set_logs?.filter((set) => (set.session_exercise_id || set.exercise_id) === exercise.id) || [];
        const isDone = completed.has(exercise.id);
        return `<article class="exercise-card ${index === 0 ? "is-active" : ""} ${isDone ? "done" : ""}" data-index="${index}" data-exercise-id="${escapeHtml(exercise.id)}">
          <div class="media-grid">
            <div class="exercise-copy">
              <div class="exercise-kicker">Exercise ${index + 1} of ${exercises.length}</div>
              <h2>${escapeHtml(exercise.name)}</h2>
              <div class="rx">${escapeHtml(prescriptionText(exercise.prescription))}</div>
              ${renderMetrics(exercise)}
              ${exercise.rationale ? `<div class="why">${escapeHtml(exercise.rationale)}</div>` : ""}
              ${renderAlternatives(exercise)}
              <section class="set-console" aria-label="Log a set for ${escapeHtml(exercise.name)}">
                <div class="set-header"><div><strong>Log this set</strong><div class="set-help">Set the reps and load you actually did, then tap Add set.</div></div><span class="set-count"><span data-set-count>${loggedSets.length}</span> saved</span></div>
                <div class="set-counters">
                  <div class="counter-wrap"><div class="counter-label">Reps done</div><div class="counter-group" aria-label="Reps done counter"><button type="button" data-counter="reps" data-delta="-1" ${isCompleted ? "disabled" : ""}>−</button><div class="counter-value" data-reps-count>${escapeHtml(exercise.prescription?.reps || 0)}</div><button type="button" data-counter="reps" data-delta="1" ${isCompleted ? "disabled" : ""}>+</button></div></div>
                  <div class="counter-wrap"><div class="counter-label">Load used</div><div class="counter-group" aria-label="Load used counter"><button type="button" data-counter="load" data-delta="-2.5" ${isCompleted ? "disabled" : ""}>−</button><div class="counter-value" data-load-count>${escapeHtml(exercise.prescription?.load || 0)}</div><button type="button" data-counter="load" data-delta="2.5" ${isCompleted ? "disabled" : ""}>+</button></div></div>
                </div>
                <div class="field-grid"><label class="field">Load used<input class="set-input" data-load placeholder="kg / lb / band" value="${escapeHtml(exercise.prescription?.load || "")}" ${isCompleted ? "disabled" : ""}></label><label class="field">Reps done<input class="set-input" data-reps placeholder="reps" value="${escapeHtml(exercise.prescription?.reps || "")}" ${isCompleted ? "disabled" : ""}></label></div>
                <div class="timer-row"><div><div class="metric-label">Rest timer</div><div class="timer-time" data-timer>00:00</div></div><div class="button-row"><button type="button" class="secondary" data-action="toggle-timer" data-index="${index}" ${isCompleted ? "disabled" : ""}>Start timer</button><button type="button" class="ghost" data-action="reset-timer" data-index="${index}" ${isCompleted ? "disabled" : ""}>Reset</button></div></div>
                <textarea class="exercise-note" data-exercise-note placeholder="Exercise note: machine, pain, form cue…" ${isCompleted ? "readonly" : ""}></textarea>
                <div class="button-row"><button type="button" data-log-set ${isCompleted ? "disabled" : ""}>Add set</button><button type="button" class="secondary" data-done ${isDone ? "data-completed=\"true\"" : ""} ${isCompleted ? "disabled" : ""}>${isDone ? "Done" : "Mark done"}</button></div>
              </section>
            </div>
            ${renderExerciseMedia(exercise)}
          </div>
        </article>`;
      }).join("")}
    </section>

    ${pendingProposals.length ? `<section class="panel" id="proposalPanel"><strong>Pending coach changes</strong>${pendingProposals.map((proposal) => `<article class="proposal" data-proposal-id="${escapeHtml(proposal.id)}"><p>${escapeHtml(proposal.reason || "Review this proposed session change.")}</p><pre>${escapeHtml(JSON.stringify(proposal.patch, null, 2))}</pre>${isCompleted ? "" : `<div class="button-row"><button type="button" data-apply-proposal>Apply change</button><button type="button" class="secondary" data-reject-proposal>Reject</button></div>`}</article>`).join("")}</section>` : ""}

    <section class="panel">
      <label for="notes"><strong>Session notes</strong></label>
      <textarea class="session-note" id="notes" placeholder="Pain, machine swaps, loads used, how it felt…" ${isCompleted ? "readonly" : ""}>${escapeHtml(latestNote)}</textarea>
      <div class="actions">
        <span class="toast" id="toast">Ready</span>
        <div class="button-row">
          ${isCompleted ? "" : `<button type="button" class="secondary" data-effort="too_easy">Too easy</button><button type="button" class="secondary" data-effort="too_hard">Too hard</button><button type="button" class="danger" data-effort="pain">Pain</button><button type="button" class="secondary" id="saveNote">Save note</button><button type="button" id="complete">Complete session</button>`}
        </div>
      </div>
    </section>
  </main>

  <nav class="bottom-bar" aria-label="Workout navigation">
    <button type="button" class="secondary" id="prevExercise">Back</button>
    <div class="bottom-title"><strong id="bottomExerciseName">${escapeHtml(exercises[0]?.name || "Training")}</strong><span id="bottomStatus">Ready</span></div>
    <div class="bottom-actions"><button type="button" class="secondary" id="nextExercise" ${isCompleted ? "disabled" : ""}>Next</button><button type="button" id="bottomAddSet" ${isCompleted ? "disabled" : ""}>Add set</button><button type="button" id="bottomDone" ${isCompleted ? "disabled" : ""}>Done + next</button></div>
  </nav>

  <script type="module">
    const session = ${scriptJson({ id: session.id, active_version: session.active_version, status: session.status, completed_exercise_ids: liveState.completed_exercise_ids, set_logs: liveState.set_logs, exercise_count: exercises.length })};
    const exerciseNames = ${scriptJson(exercises.map((exercise) => exercise.name))};
    const toast = document.querySelector('#toast');
    const notes = document.querySelector('#notes');
    const complete = document.querySelector('#complete');
    const saveNote = document.querySelector('#saveNote');
    const cards = [...document.querySelectorAll('.exercise-card')];
    const checked = new Set(session.completed_exercise_ids || []);
    const timers = new Map();
    let activeIndex = 0;
    let elapsedSeconds = 0;

    function apiUrl(path) { const url = new URL(path, location.href); url.username = ''; url.password = ''; return url.href; }
    function setToast(text) { if (toast) toast.textContent = text; document.querySelector('#bottomStatus').textContent = text; }
    function formatTime(total) { const minutes = String(Math.floor(total / 60)).padStart(2, '0'); const seconds = String(total % 60).padStart(2, '0'); return minutes + ':' + seconds; }
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
    function setReadOnlyAfterComplete() {
      for (const control of document.querySelectorAll('input, textarea, button')) control.disabled = true;
      notes.readOnly = true;
      document.querySelector('#statusPill').textContent = 'completed';
    }
    function updateProgress() {
      const total = cards.length || 1;
      const done = checked.size;
      document.querySelector('#completedCount').textContent = done;
      document.querySelector('#progressLabel').textContent = 'Exercise ' + Math.min(activeIndex + 1, total) + ' of ' + total;
      const percent = Math.round((done / total) * 100);
      document.querySelector('#progressPercent').textContent = percent + '%';
      document.querySelector('#progressFill').style.width = percent + '%';
      document.querySelector('#bottomExerciseName').textContent = exerciseNames[activeIndex] || 'Training';
      document.querySelector('#prevExercise').disabled = activeIndex === 0 || session.status === 'completed';
      document.querySelector('#nextExercise').disabled = activeIndex >= total - 1 || session.status === 'completed';
    }
    function showExercise(index) {
      if (!cards.length) return;
      activeIndex = Math.max(0, Math.min(index, cards.length - 1));
      for (const [cardIndex, card] of cards.entries()) card.classList.toggle('is-active', cardIndex === activeIndex);
      updateProgress();
    }
    async function markExercise(card, completed) {
      if (session.status === 'completed') return;
      const id = card.dataset.exerciseId;
      card.classList.toggle('done', completed);
      card.querySelector('[data-done]').dataset.completed = String(completed);
      card.querySelector('[data-done]').textContent = completed ? 'Done' : 'Mark done';
      if (completed) checked.add(id); else checked.delete(id);
      updateProgress();
      await postEvent('exercise_completion_updated', { session_exercise_id: id, completed, completed_ids: [...checked] });
    }
    async function logSet(card) {
      if (session.status === 'completed') return;
      const id = card.dataset.exerciseId;
      const load = card.querySelector('[data-load]')?.value.trim();
      const reps = card.querySelector('[data-reps]')?.value.trim();
      const note = card.querySelector('[data-exercise-note]')?.value.trim();
      await postEvent('set_logged', { session_exercise_id: id, load, reps, note });
      const count = card.querySelector('[data-set-count]');
      count.textContent = String(Number(count.textContent || 0) + 1);
    }
    function adjustCounter(card, kind, delta) {
      const input = card.querySelector(kind === 'reps' ? '[data-reps]' : '[data-load]');
      const readout = card.querySelector(kind === 'reps' ? '[data-reps-count]' : '[data-load-count]');
      const current = Number.parseFloat(input.value || readout.textContent || 0) || 0;
      const next = Math.max(0, current + Number(delta));
      const normalized = Number.isInteger(next) ? String(next) : String(next.toFixed(1));
      input.value = normalized;
      readout.textContent = normalized;
    }
    function toggleTimer(card, button) {
      const timer = card.querySelector('[data-timer]');
      const index = card.dataset.index;
      const current = timers.get(index) || { seconds: 0, handle: null };
      if (current.handle) {
        clearInterval(current.handle);
        current.handle = null;
        button.textContent = 'Start timer';
      } else {
        current.handle = setInterval(() => { current.seconds += 1; timer.textContent = formatTime(current.seconds); }, 1000);
        button.textContent = 'Pause timer';
      }
      timers.set(index, current);
    }
    function resetTimer(card) {
      const index = card.dataset.index;
      const current = timers.get(index);
      if (current?.handle) clearInterval(current.handle);
      timers.set(index, { seconds: 0, handle: null });
      card.querySelector('[data-timer]').textContent = '00:00';
      card.querySelector('[data-action="toggle-timer"]').textContent = 'Start timer';
    }

    startSession();
    setInterval(() => { elapsedSeconds += 1; document.querySelector('#elapsedPill').textContent = formatTime(elapsedSeconds) + ' elapsed'; }, 1000);
    document.querySelector('#prevExercise')?.addEventListener('click', () => showExercise(activeIndex - 1));
    document.querySelector('#nextExercise')?.addEventListener('click', () => showExercise(activeIndex + 1));
    document.querySelector('#bottomAddSet')?.addEventListener('click', () => logSet(cards[activeIndex]).catch((error) => setToast(error.message)));
    document.querySelector('#bottomDone')?.addEventListener('click', async () => {
      try {
        await markExercise(cards[activeIndex], true);
        if (activeIndex < cards.length - 1) showExercise(activeIndex + 1);
      } catch (error) { setToast(error.message); }
    });

    for (const card of cards) {
      card.querySelector('[data-log-set]')?.addEventListener('click', () => logSet(card).catch((error) => setToast(error.message)));
      card.querySelector('[data-done]')?.addEventListener('click', () => markExercise(card, card.querySelector('[data-done]').dataset.completed !== 'true').catch((error) => setToast(error.message)));
      for (const button of card.querySelectorAll('[data-counter]')) button.addEventListener('click', () => adjustCounter(card, button.dataset.counter, button.dataset.delta));
      card.querySelector('[data-action="toggle-timer"]')?.addEventListener('click', (event) => toggleTimer(card, event.currentTarget));
      card.querySelector('[data-action="reset-timer"]')?.addEventListener('click', () => resetTimer(card));
    }

    async function saveNotes() { const text = notes.value.trim(); if (!text) return; await postEvent('note_added', { note: text }); }
    saveNote?.addEventListener('click', () => saveNotes().catch((error) => setToast(error.message)));
    for (const button of document.querySelectorAll('[data-effort]')) button.addEventListener('click', () => postEvent('effort_flag_logged', { kind: button.dataset.effort }).catch((error) => setToast(error.message)));
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
        await saveNotes().catch(() => null);
        await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/complete', { completion: { completed_at: new Date().toISOString(), notes: notes.value.trim(), completed_exercise_ids: [...checked] } });
        setToast('Completed and logged');
        session.status = 'completed';
        setReadOnlyAfterComplete();
      } catch (error) { setToast(error.message); }
    });
    showExercise(0);
  </script>
</body>
</html>`;
}
