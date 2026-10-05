/** @jsxImportSource hono/jsx */
import { renderToString } from "hono/jsx/dom/server";
import { buildLiveSessionViewModel } from "./live-session-view-model.mjs";
import { LIVE_SESSION_CSS } from "./live-session-styles.mjs";
import { renderLiveSessionRuntime } from "./live-session-runtime.mjs";

type LiveSessionModel = ReturnType<typeof buildLiveSessionViewModel>;
type LiveExercise = LiveSessionModel["exercises"][number];
type LiveMetric = LiveExercise["metrics"][number];

export function renderLiveSessionPage(session: unknown) {
  const model = buildLiveSessionViewModel(session as Parameters<typeof buildLiveSessionViewModel>[0]);
  const html = renderToString(<LiveTrainingSessionDocument model={model} />);
  return `<!doctype html>${html.replace("</body>", `${renderLiveSessionRuntime(model.runtime)}</body>`)}`;
}

function LiveTrainingSessionDocument({ model }: { model: LiveSessionModel }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#10120f" />
        <title>{model.session.title}</title>
        <link rel="preload" href="/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: LIVE_SESSION_CSS }} />
      </head>
      <body>
        <main class="session-shell">
          <Masthead model={model} />
          <div class="workspace-scroll">
            <RoutePanel model={model} />
            <section class="exercise-stage" id="exerciseStage" aria-label="Current exercise">
              {model.exercises.length
                ? model.exercises.map((exercise, index) => <ExerciseWork exercise={exercise} index={index} model={model} />)
                : <EmptySession model={model} />}
            </section>
            <aside class="context-column" aria-label="Training details">
              {model.exercises.map((exercise, index) => <ExerciseContext exercise={exercise} index={index} model={model} />)}
              <ProposalPanel model={model} />
              <SessionNotes model={model} />
            </aside>
          </div>
          <BottomBar model={model} />
        </main>
      </body>
    </html>
  );
}

function Wordmark() {
  return <span class="wordmark" aria-label="Flue"><span aria-hidden="true">FLU</span><span class="wordmark-e" aria-hidden="true">E</span></span>;
}

function Masthead({ model }: { model: LiveSessionModel }) {
  const session = model.session;
  return (
    <header class="masthead session-status-bar">
      <Wordmark />
      <div class="session-heading">
        <h1>{session.title}</h1>
        <span>{model.progress.exercise_count} movements</span>
      </div>
      <div class={`live-state ${session.is_completed ? "is-complete" : ""}`}>
        <span class="state-mark" aria-hidden="true"></span>
        <span id="statusPill">{session.is_completed ? "Completed" : session.status === "planned" ? "Starting" : "Live"}</span>
        <span aria-hidden="true">·</span>
        <span id="elapsedPill">00:00</span>
      </div>
    </header>
  );
}

function RoutePanel({ model }: { model: LiveSessionModel }) {
  const total = model.progress.exercise_count;
  return (
    <aside class="route-panel" aria-label="Workout route">
      <div class="route-summary">
        <span class="micro-label">Workout route</span>
        <div><strong id="progressLabel">{total ? `01 / ${String(total).padStart(2, "0")}` : "00 / 00"}</strong><span id="progressPercent">0% through</span></div>
        <div class="progress-track" aria-hidden="true"><div class="progress-fill" id="progressFill"></div></div>
        <span class="sr-only"><span id="completedCount">{model.progress.completed_count}</span> exercises complete</span>
      </div>
      <ol class="route-list">
        {model.exercises.map((exercise, index) => (
          <li class={index === 0 ? "is-current" : ""} data-route-item={index}>
            <button type="button" data-exercise-jump={index} aria-label={`Review ${exercise.name}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{exercise.name}</strong>
              <small>{exercise.current_set.total ? `${exercise.current_set.total} sets` : exercise.prescription_text}</small>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function ExerciseWork({ exercise, index, model }: { exercise: LiveExercise; index: number; model: LiveSessionModel }) {
  return (
    <article class={`exercise-card ${index === 0 ? "is-active" : ""} ${exercise.is_done ? "done" : ""}`} data-index={index} data-exercise-id={exercise.id}>
      <div class="exercise-position"><span>Exercise {index + 1}/{model.exercises.length}</span><strong data-position-label>{exercise.current_set.position_label}</strong></div>
      <ExerciseMedia exercise={exercise} eager={index === 0} />
      <MetricStrip metrics={exercise.metrics} variant="mobile" />
      <SetConsole exercise={exercise} index={index} isCompleted={model.session.is_completed} />
    </article>
  );
}

function SetConsole({ exercise, index, isCompleted }: { exercise: LiveExercise; index: number; isCompleted: boolean }) {
  const actionKey = `set:${exercise.id}`;
  const latestSet = exercise.saved_sets?.at(-1);
  return (
    <section class={`set-console ${isCompleted ? "is-readonly" : ""}`} aria-label={isCompleted ? `Set history for ${exercise.name}` : `Log a set for ${exercise.name}`}>
      <div class="set-header">
        <div>
          <span class="micro-label">{isCompleted ? "Set history" : "Current set"}</span>
          <strong class="current-set-label" data-current-set-label data-set-total={exercise.current_set.total || undefined}>{isCompleted ? "Set history" : exercise.current_set.label}</strong>
        </div>
        <span class="set-help">{isCompleted ? "Read-only" : exercise.current_set.is_complete ? "Planned work complete" : "Adjust after the set"}</span>
      </div>
      {isCompleted ? (
        <div class="readonly-values">
          <div><span class="metric-label">Last reps</span><strong data-reps>{latestSet?.reps || "—"}</strong><span class="lock-mark" aria-label="Read-only">■</span></div>
          <div><span class="metric-label">Last load</span><strong data-load>{latestSet?.load || "—"}</strong><span class="lock-mark" aria-label="Read-only">■</span></div>
        </div>
      ) : (
        <div class="field-grid fast-fields">
          <div class="value-field">
            <label for={`reps-${index}`}>Actual reps</label>
            <div><input id={`reps-${index}`} class="set-input" inputmode="decimal" data-reps aria-label="Actual reps" value={exercise.input_reps} /><Stepper field="reps" /></div>
          </div>
          <div class="value-field">
            <label for={`load-${index}`}>Actual load</label>
            <div><input id={`load-${index}`} class="set-input" inputmode="decimal" data-load aria-label="Actual load" value={exercise.input_load} /><Stepper field="load" /></div>
          </div>
        </div>
      )}
      <label class="note-field">
        <span>{isCompleted ? "Saved note" : "Set note (optional)"}</span>
        {isCompleted
          ? <output data-exercise-note>{latestSet?.note || "No note saved"}</output>
          : <textarea class="exercise-note" data-exercise-note placeholder="Form, pain, or adjustment…"></textarea>}
      </label>
      {!isCompleted ? (
        <>
          <button type="button" class="log-set" data-log-set data-action-key={actionKey} aria-describedby={`set-feedback-${index}`}>
            <span data-action-label>{exercise.current_set.primary_action_label}</span><span data-action-suffix>{String(exercise.logged_set_count + 1).padStart(2, "0")} →</span>
          </button>
          <div class="pending-line" data-pending-line aria-hidden="true"><span></span></div>
          <div class="action-error" data-error role="alert" aria-live="assertive" hidden></div>
        </>
      ) : null}
      <div class="set-feedback-row">
        <div class="set-feedback" id={`set-feedback-${index}`} data-set-feedback role="status" aria-live="polite">
          <span class="diamond-check" aria-hidden="true">✓</span>
          <span><strong>{latestSet ? `Set ${exercise.logged_set_count} saved` : "Session saved"}</strong><small>{latestSet ? `${latestSet.reps || "—"} reps${latestSet.load ? ` · ${latestSet.load}` : ""}` : "No sets logged yet"}</small></span>
        </div>
        <RestTimer exercise={exercise} index={index} isCompleted={isCompleted} />
      </div>
      <SavedSets exercise={exercise} />
      {isCompleted ? <div class="readonly-callout"><span class="diamond-check" aria-hidden="true">✓</span><span><strong>Session completed · Read-only</strong><small>Set, note, timer, and completion changes are unavailable.</small></span></div> : null}
    </section>
  );
}

function Stepper({ field }: { field: "reps" | "load" }) {
  return <span class="stepper"><button type="button" data-step-field={field} data-step="up" aria-label={`Increase ${field}`}>+</button><button type="button" data-step-field={field} data-step="down" aria-label={`Decrease ${field}`}>−</button></span>;
}

function RestTimer({ exercise, index, isCompleted }: { exercise: LiveExercise; index: number; isCompleted: boolean }) {
  const seconds = Number(exercise.current_set.target_rest_seconds || 0);
  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div class="timer-row rest-row" data-rest-row data-rest-seconds={seconds}>
      <span><span class="metric-label">Rest <em data-timer-state>{isCompleted ? "Read-only" : "Idle"}</em></span><strong class="timer-time" data-timer>{formatted}</strong></span>
      {!isCompleted ? <span class="timer-actions"><button type="button" data-write-control data-action="toggle-timer" data-index={index}>Start rest</button><button type="button" data-write-control data-action="reset-timer" data-index={index}>Reset</button></span> : <span class="lock-mark" aria-label="Read-only">■</span>}
    </div>
  );
}

function EmptySession({ model }: { model: LiveSessionModel }) {
  return (
    <article class="empty-session is-active">
      <span class="micro-label">Session setup</span>
      <h2>No exercises in this session yet</h2>
      <p>Ask the coach to build or repair this session before training.</p>
      <a class="text-link" href={`/chat?profile_id=${encodeURIComponent(model.session.profile_id)}&session_id=${encodeURIComponent(String(model.session.id))}`}>Ask coach →</a>
    </article>
  );
}

function SavedSets({ exercise }: { exercise: LiveExercise }) {
  const count = <span data-set-count hidden>{exercise.logged_set_count}</span>;
  if (!exercise.saved_sets?.length) return <div class="saved-sets empty">{count}No sets logged yet</div>;
  return <div class="saved-sets" aria-label="Saved sets">{count}<span class="metric-label">Saved sets</span>{exercise.saved_sets.map((set, index) => <span><b>{String(index + 1).padStart(2, "0")}</b> {set.reps || "—"}×{set.load || "—"}</span>)}</div>;
}

function MetricStrip({ metrics, variant }: { metrics: LiveMetric[]; variant: "mobile" | "context" }) {
  if (!metrics.length) return <div class={`metric-strip ${variant} empty`}>Prescription details unavailable</div>;
  return <div class={`metric-strip ${variant}`} aria-label="Prescription">{metrics.filter((metric) => metric.key !== "sets").map((metric) => <div data-metric={metric.key}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>;
}

function ExerciseContext({ exercise, index, model }: { exercise: LiveExercise; index: number; model: LiveSessionModel }) {
  return (
    <section class={`context-region ${index === 0 ? "is-active" : ""}`} data-context-index={index}>
      <section class="context-section prescription-section">
        <header><h2>Prescription</h2><span>Set {String(Math.min(exercise.logged_set_count + 1, exercise.current_set.total || exercise.logged_set_count + 1)).padStart(2, "0")}</span></header>
        <MetricStrip metrics={exercise.metrics} variant="context" />
        {exercise.plan_note?.full ? <p class="plan-copy">{exercise.plan_note.full}</p> : null}
      </section>
      {exercise.has_optional_details ? <section class="context-section details-panel"><header><h2>Details</h2><span>Form</span></header>{exercise.rationale ? <p>{exercise.rationale}</p> : null}<Alternatives exercise={exercise} /></section> : null}
      {!model.session.is_completed ? <button type="button" class="movement-done" data-write-control data-done data-completed={exercise.is_done ? "true" : undefined}>{exercise.is_done ? "Movement complete ✓" : "Mark movement done"}</button> : null}
      <a class="text-link coach-link" href={`/chat?profile_id=${encodeURIComponent(model.session.profile_id)}&session_id=${encodeURIComponent(String(model.session.id))}`}>Ask coach →</a>
    </section>
  );
}

function ExerciseMedia({ exercise, eager }: { exercise: LiveExercise; eager: boolean }) {
  const media = exercise.media;
  return (
    <figure class={`exercise-media ${media.image ? "" : "fallback"}`}>
      {media.image ? <img src={media.image} alt={`${exercise.name} exercise photo`} loading={eager ? "eager" : "lazy"} decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').classList.add('fallback'); this.remove();" /> : null}
      <div class="media-fallback"><span aria-hidden="true">{media.fallback_letter}</span><strong>Image unavailable</strong></div>
      <div class="image-screen" aria-hidden="true"></div>
      <h2>{exercise.name}</h2>
      <figcaption><span>Movement {String(exercise.index + 1).padStart(2, "0")}</span><strong>{media.caption}</strong></figcaption>
    </figure>
  );
}

function Alternatives({ exercise }: { exercise: LiveExercise }) {
  if (!exercise.alternatives?.length) return null;
  return <details class="alternatives"><summary>Swap ideas</summary><ul>{exercise.alternatives.map((alt: any) => <li>{alt.name || alt}</li>)}</ul></details>;
}

function ProposalPanel({ model }: { model: LiveSessionModel }) {
  if (!model.proposals.length) return null;
  return (
    <section class="context-section proposal-panel" id="proposalPanel">
      <header><h2>Pending coach changes</h2><span>{String(model.proposals.length).padStart(2, "0")}</span></header>
      {model.proposals.map((proposal) => <article class="proposal" data-proposal-id={proposal.id}><p>{proposal.reason || "Review this proposed session change."}</p><pre>{JSON.stringify(proposal.patch, null, 2)}</pre>{model.session.is_completed ? null : <div class="proposal-actions"><button type="button" data-write-control data-apply-proposal>Apply change</button><button type="button" data-write-control data-reject-proposal>Reject</button></div>}</article>)}
    </section>
  );
}

function SessionNotes({ model }: { model: LiveSessionModel }) {
  const isCompleted = model.session.is_completed;
  return (
    <section class="context-section session-finish">
      <header><h2>Session finish</h2></header>
      {!isCompleted ? <><span class="micro-label">Effort check</span><div class="effort-actions"><button type="button" data-write-control data-effort="too_easy" aria-pressed="false">Too easy</button><button type="button" data-write-control data-effort="too_hard" aria-pressed="false">Too hard</button><button type="button" data-write-control data-effort="pain" aria-pressed="false">Pain</button></div></> : null}
      <label class="session-note-field" for="notes"><span>Session notes</span><textarea class="session-note" id="notes" placeholder="Pain, swaps, loads, how it felt…" readonly={isCompleted || undefined}>{model.notes.latest}</textarea></label>
      <span class="toast" id="toast" role="status" aria-live="polite">{isCompleted ? "Session completed · Read-only" : "Ready"}</span>
      {!isCompleted ? <div class="finish-actions"><button type="button" data-write-control id="saveNote">Save note</button><button type="button" data-write-control id="complete">Complete session <span>→</span></button></div> : <div class="readonly-callout compact"><span class="diamond-check" aria-hidden="true">✓</span><span><strong>Session completed · Read-only</strong><small>Review remains available.</small></span></div>}
    </section>
  );
}

function BottomBar({ model }: { model: LiveSessionModel }) {
  const hasExercises = model.exercises.length > 0;
  return (
    <nav class="bottom-bar" aria-label={model.session.is_completed ? "Review exercise" : "Exercise navigation"}>
      <button type="button" id="prevExercise" aria-label="Previous exercise" disabled={!hasExercises || undefined}>←</button>
      <div class="bottom-title"><span>{model.session.is_completed ? "Review exercise" : "Session route"}</span><strong id="bottomExerciseName">{hasExercises ? `01 / ${String(model.exercises.length).padStart(2, "0")}` : "00 / 00"}</strong><small id="bottomStatus">{model.session.is_completed ? "Read-only" : "Ready"}</small></div>
      <button type="button" id="nextExercise" aria-label="Next exercise" disabled={!hasExercises || undefined}>→</button>
    </nav>
  );
}
