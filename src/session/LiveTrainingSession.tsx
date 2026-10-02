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
  const title = model.session.title;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: LIVE_SESSION_CSS }} />
      </head>
      <body>
        <main>
          <Hero model={model} />
          <section class="exercise-stage" id="exerciseStage" aria-live="polite">
            {model.exercises.map((exercise, index) => <ExerciseCard exercise={exercise} index={index} model={model} />)}
          </section>
          <ProposalPanel model={model} />
          <SessionNotes model={model} />
        </main>
        <BottomBar model={model} />
      </body>
    </html>
  );
}

function Hero({ model }: { model: LiveSessionModel }) {
  const session = model.session;
  const count = model.progress.exercise_count || 1;
  return (
    <header class="hero">
      <div class="topline">
        <div class="eyebrow">Live training session</div>
        <div class="hero-actions">
          <a class="coach-link" href={`/chat?profile_id=${encodeURIComponent(session.profile_id)}&session_id=${encodeURIComponent(String(session.id))}`}>Ask coach</a>
        </div>
      </div>
      <h1>{session.title}</h1>
      <div class="summary">{session.summary}</div>
      <div class="session-stats">
        <span class="pill">{session.profile_id}</span>
        <span class="pill" id="statusPill">{session.status}</span>
        <span class="pill"><span id="completedCount">{model.progress.completed_count}</span>/{model.progress.exercise_count} done</span>
        <span class="pill" id="elapsedPill">00:00 elapsed</span>
        {session.is_completed ? <span class="pill readonly">completed sessions are read-only</span> : null}
      </div>
      <div class="progress-shell">
        <div class="progress-row"><span id="progressLabel">Exercise 1 of {count}</span><span id="progressPercent">0%</span></div>
        <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      </div>
    </header>
  );
}

function ExerciseCard({ exercise, index, model }: { exercise: LiveExercise; index: number; model: LiveSessionModel }) {
  const isCompleted = model.session.is_completed;
  const doneText = exercise.is_done ? "Done" : "Mark done";
  return (
    <article class={`exercise-card ${index === 0 ? "is-active" : ""} ${exercise.is_done ? "done" : ""}`} data-index={index} data-exercise-id={exercise.id}>
      <div class="media-grid">
        <div class="exercise-copy">
          <div class="exercise-kicker">Exercise {index + 1} of {model.exercises.length}</div>
          <h2>{exercise.name}</h2>
          <div class="rx">{exercise.prescription_text}</div>
          <MetricStrip metrics={exercise.metrics} />
          <PrescriptionNotes notes={exercise.prescription_notes} />
          {exercise.rationale ? <div class="why">{exercise.rationale}</div> : null}
          <Alternatives exercise={exercise} />
          <section class="set-console" aria-label={`Log a set for ${exercise.name}`}>
            <div class="set-header">
              <div><strong>Log this set</strong><div class="set-help">Set the reps and load you actually did, then tap Add set.</div></div>
              <span class="set-count"><span data-set-count>{exercise.logged_set_count}</span> saved</span>
            </div>
            <div class="set-counters">
              <Counter kind="reps" label="Reps done" delta="1" negativeDelta="-1" value={exercise.initial_reps} disabled={isCompleted} />
              <Counter kind="load" label="Load used" delta="2.5" negativeDelta="-2.5" value={exercise.initial_load} disabled={isCompleted} />
            </div>
            <div class="field-grid">
              <label class="field">Load used<input class="set-input" data-load placeholder="kg / lb / band" value={exercise.input_load} disabled={isCompleted || undefined} /></label>
              <label class="field">Reps done<input class="set-input" data-reps placeholder="reps" value={exercise.input_reps} disabled={isCompleted || undefined} /></label>
            </div>
            <div class="timer-row">
              <div><div class="metric-label">Rest timer</div><div class="timer-time" data-timer>00:00</div></div>
              <div class="button-row"><button type="button" class="secondary" data-action="toggle-timer" data-index={index} disabled={isCompleted || undefined}>Start timer</button><button type="button" class="ghost" data-action="reset-timer" data-index={index} disabled={isCompleted || undefined}>Reset</button></div>
            </div>
            <textarea class="exercise-note" data-exercise-note placeholder="Exercise note: machine, pain, form cue…" readonly={isCompleted || undefined}></textarea>
            <div class="button-row"><button type="button" data-log-set disabled={isCompleted || undefined}>Add set</button><button type="button" class="secondary" data-done data-completed={exercise.is_done ? "true" : undefined} disabled={isCompleted || undefined}>{doneText}</button></div>
          </section>
        </div>
        <ExerciseMedia exercise={exercise} />
      </div>
    </article>
  );
}

function PrescriptionNotes({ notes }: { notes?: string[] }) {
  if (!notes?.length) return null;
  return <div class="prescription-note"><strong>Plan note</strong>{notes.map((note) => <p>{note}</p>)}</div>;
}

function MetricStrip({ metrics }: { metrics: LiveMetric[] }) {
  if (!metrics.length) return <div class="metric-strip empty">Prescription details unavailable</div>;
  return (
    <div class="metric-strip">
      {metrics.map((metric) => (
        <div class="metric-card" data-metric={metric.key}>
          <span class="metric-icon" aria-hidden="true">{metric.icon}</span>
          <span class="metric-label">{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Counter({ kind, label, negativeDelta, delta, value, disabled }: { kind: string; label: string; negativeDelta: string; delta: string; value: unknown; disabled: boolean }) {
  const countAttr = kind === "reps" ? { "data-reps-count": true } : { "data-load-count": true };
  return (
    <div class="counter-wrap">
      <div class="counter-label">{label}</div>
      <div class="counter-group" aria-label={`${label} counter`}>
        <button type="button" data-counter={kind} data-delta={negativeDelta} disabled={disabled || undefined}>−</button>
        <div class="counter-value" {...countAttr}>{value}</div>
        <button type="button" data-counter={kind} data-delta={delta} disabled={disabled || undefined}>+</button>
      </div>
    </div>
  );
}

function ExerciseMedia({ exercise }: { exercise: LiveExercise }) {
  const media = exercise.media;
  if (!media.image) {
    return <div class="exercise-media fallback" role="img" aria-label={`${exercise.name} illustration`}><span aria-hidden="true">{media.fallback_letter}</span></div>;
  }
  return (
    <figure class="exercise-media">
      <img src={media.image} alt={`${exercise.name} exercise photo`} loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').classList.add('fallback'); this.remove();" />
      <span class="fallback-letter" aria-hidden="true">{media.fallback_letter}</span>
      <figcaption>{media.caption}</figcaption>
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
    <section class="panel" id="proposalPanel">
      <strong>Pending coach changes</strong>
      {model.proposals.map((proposal) => (
        <article class="proposal" data-proposal-id={proposal.id}>
          <p>{proposal.reason || "Review this proposed session change."}</p>
          <pre>{JSON.stringify(proposal.patch, null, 2)}</pre>
          {model.session.is_completed ? null : <div class="button-row"><button type="button" data-apply-proposal>Apply change</button><button type="button" class="secondary" data-reject-proposal>Reject</button></div>}
        </article>
      ))}
    </section>
  );
}

function SessionNotes({ model }: { model: LiveSessionModel }) {
  const isCompleted = model.session.is_completed;
  return (
    <section class="panel">
      <label for="notes"><strong>Session notes</strong></label>
      <textarea class="session-note" id="notes" placeholder="Pain, machine swaps, loads used, how it felt…" readonly={isCompleted || undefined}>{model.notes.latest}</textarea>
      <div class="actions">
        <span class="toast" id="toast">Ready</span>
        <div class="button-row">
          {isCompleted ? null : <><button type="button" class="secondary" data-effort="too_easy">Too easy</button><button type="button" class="secondary" data-effort="too_hard">Too hard</button><button type="button" class="danger" data-effort="pain">Pain</button><button type="button" class="secondary" id="saveNote">Save note</button><button type="button" id="complete">Complete session</button></>}
        </div>
      </div>
    </section>
  );
}

function BottomBar({ model }: { model: LiveSessionModel }) {
  const isCompleted = model.session.is_completed;
  return (
    <nav class="bottom-bar" aria-label="Workout navigation">
      <button type="button" class="secondary" id="prevExercise">Back</button>
      <div class="bottom-title"><strong id="bottomExerciseName">{model.exercises[0]?.name || "Training"}</strong><span id="bottomStatus">Ready</span></div>
      <div class="bottom-actions"><button type="button" class="secondary" id="nextExercise" disabled={isCompleted || undefined}>Next</button><button type="button" id="bottomAddSet" disabled={isCompleted || undefined}>Add set</button><button type="button" id="bottomDone" disabled={isCompleted || undefined}>Done + next</button></div>
    </nav>
  );
}
