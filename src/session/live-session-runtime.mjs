import { scriptJson } from "./live-session-html.mjs";

export function renderLiveSessionRuntime(runtimeData) {
  return String.raw`<script type="module">
    window.__LIVE_SESSION__ = ${scriptJson(runtimeData)};
    const liveSession = window.__LIVE_SESSION__;
    const session = liveSession.session;
    const exerciseNames = liveSession.exerciseNames;
    const musclePaths = liveSession.musclePaths || { front: [], back: [] };
    const toast = document.querySelector('#toast');
    const notes = document.querySelector('#notes');
    const complete = document.querySelector('#complete');
    const saveNote = document.querySelector('#saveNote');
    const cards = [...document.querySelectorAll('.exercise-card[data-exercise-id]')];
    const contexts = [...document.querySelectorAll('[data-context-index]')];
    const routeItems = [...document.querySelectorAll('[data-route-item]')];
    const checked = new Set(session.completed_exercise_ids || []);
    const timers = new Map();
    const pendingActions = new Set();
    const pendingPromises = new Map();
    let activeIndex = 0;
    let elapsedSeconds = Number(session.elapsed_seconds || 0);
    let lastSavedNote = notes?.value.trim() || '';
    let noteSavePromise = null;

    function apiUrl(path) { const url = new URL(path, location.href); url.username = ''; url.password = ''; return url.href; }
    function setToast(text) {
      if (toast) toast.textContent = text;
      const bottomStatus = document.querySelector('#bottomStatus');
      if (bottomStatus) bottomStatus.textContent = text;
    }
    function formatTime(total) { const safe = Math.max(0, Number(total) || 0); const minutes = String(Math.floor(safe / 60)).padStart(2, '0'); const seconds = String(safe % 60).padStart(2, '0'); return minutes + ':' + seconds; }
    async function postJson(path, body, init = {}) {
      const response = await fetch(apiUrl(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...init });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message || 'Save failed');
      }
      return response.json();
    }
    async function postEvent(type, payload, idempotencyKey) {
      setToast('Saving…');
      const event = await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/events', { type, version: session.active_version, payload, idempotency_key: idempotencyKey || type + ':' + crypto.randomUUID() });
      setToast('Saved');
      return event;
    }
    function sessionIsReadOnly() { return session.status === 'completed' || session.status === 'aborted'; }
    function renderMuscleMaps() {
      const svgNamespace = 'http://www.w3.org/2000/svg';
      for (const map of document.querySelectorAll('[data-muscle-map]')) {
        for (const view of ['front', 'back']) {
          const svg = map.querySelector('[data-muscle-view="' + view + '"]');
          if (!svg || svg.childElementCount) continue;
          const targets = new Set((map.dataset[view + 'Targets'] || '').split(',').filter(Boolean));
          for (const muscle of musclePaths[view] || []) {
            const path = document.createElementNS(svgNamespace, 'path');
            path.setAttribute('d', muscle.path);
            path.setAttribute('data-muscle-id', muscle.id);
            if (targets.has(muscle.id)) path.setAttribute('class', 'is-target');
            svg.append(path);
          }
        }
      }
    }
    function setupLightbox() {
      const dialog = document.querySelector('#exerciseLightbox');
      const image = dialog?.querySelector('[data-lightbox-image]');
      const count = dialog?.querySelector('[data-lightbox-count]');
      const error = dialog?.querySelector('[data-lightbox-error]');
      if (!dialog || !image || typeof dialog.showModal !== 'function') return;
      let items = [];
      let current = 0;
      let opener = null;
      function show(index) {
        if (!items.length) return;
        current = (index + items.length) % items.length;
        image.hidden = false;
        if (error) error.hidden = true;
        image.src = items[current].dataset.lightboxSrc;
        image.alt = items[current].dataset.lightboxAlt || 'Exercise reference image';
        if (count) count.textContent = String(current + 1) + ' / ' + String(items.length);
      }
      for (const trigger of document.querySelectorAll('[data-lightbox-src]')) trigger.addEventListener('click', () => {
        opener = trigger;
        const exerciseId = trigger.dataset.lightboxExercise;
        const galleryItems = [...document.querySelectorAll('.exercise-gallery [data-lightbox-exercise="' + CSS.escape(exerciseId) + '"]')];
        items = galleryItems.length ? galleryItems : [trigger];
        const requestedIndex = Number(trigger.dataset.lightboxIndex || 0);
        show(Math.min(requestedIndex, items.length - 1));
        dialog.showModal();
      });
      image.addEventListener('error', () => { image.hidden = true; if (error) error.hidden = false; });
      dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());
      dialog.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => show(current - 1));
      dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(current + 1));
      dialog.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') show(current - 1); if (event.key === 'ArrowRight') show(current + 1); });
      dialog.addEventListener('close', () => { image.removeAttribute('src'); opener?.focus(); });
    }
    function setupSessionActions() {
      const dialog = document.querySelector('#sessionActionDialog');
      const confirmButton = dialog?.querySelector('[data-session-confirm]');
      const title = dialog?.querySelector('[data-session-dialog-title]');
      const copy = dialog?.querySelector('[data-session-dialog-copy]');
      if (!dialog || !confirmButton || typeof dialog.showModal !== 'function') return;
      let action = null;
      for (const trigger of document.querySelectorAll('[data-session-action]')) trigger.addEventListener('click', () => {
        action = trigger.dataset.sessionAction;
        const restarting = action === 'restart';
        title.textContent = restarting ? 'Start this session over?' : 'Cancel this session?';
        copy.textContent = restarting
          ? 'The current session stays in history as canceled. A fresh copy opens with no logged sets or notes.'
          : 'Saved work stays in history. Unsaved entries will not be kept, and this session leaves Home.';
        confirmButton.textContent = restarting ? 'Start over' : 'Cancel session';
        dialog.returnValue = '';
        dialog.showModal();
      });
      dialog.addEventListener('close', async () => {
        if (dialog.returnValue !== 'confirm' || !action) return;
        confirmButton.disabled = true;
        setToast(action === 'restart' ? 'Starting over…' : 'Canceling…');
        try {
          await waitForPendingWrites();
          if (sessionIsReadOnly()) throw new Error('This session is already read-only');
          if (action === 'restart') {
            const fresh = await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/restart', { restarted_at: new Date().toISOString() });
            location.href = '/sessions/' + encodeURIComponent(fresh.id);
          } else {
            await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/cancel', { reason: 'Canceled by user' });
            location.href = '/';
          }
        } catch (error) {
          confirmButton.disabled = false;
          setToast(error.message || 'Session action failed');
        }
      });
    }
    function buttonsForKey(key) { return [...document.querySelectorAll('[data-action-key="' + CSS.escape(key) + '"]')]; }
    function syncCompletionControl() {
      if (!complete || sessionIsReadOnly()) return;
      complete.disabled = pendingActions.has('complete') || [...pendingActions].some((key) => key.startsWith('set:'));
    }
    async function withPending(key, fn) {
      if (pendingActions.has(key) || sessionIsReadOnly()) return pendingPromises.get(key) || null;
      pendingActions.add(key);
      for (const button of buttonsForKey(key)) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      syncCompletionControl();
      const promise = Promise.resolve().then(fn);
      pendingPromises.set(key, promise);
      try { return await promise; }
      finally {
        pendingPromises.delete(key);
        pendingActions.delete(key);
        if (!sessionIsReadOnly()) for (const button of buttonsForKey(key)) { button.disabled = false; button.removeAttribute('aria-busy'); }
        syncCompletionControl();
      }
    }
    async function waitForPendingSets() {
      const saves = [...pendingPromises.entries()].filter(([key]) => key.startsWith('set:')).map(([, promise]) => promise);
      if (saves.length) await Promise.all(saves);
    }
    async function waitForPendingWrites() {
      const writes = [...pendingPromises.values()];
      if (noteSavePromise && !writes.includes(noteSavePromise)) writes.push(noteSavePromise);
      if (writes.length) await Promise.allSettled(writes);
    }
    function setActionError(card, text) {
      const error = card?.querySelector('[data-error]');
      if (!error) return;
      error.hidden = !text;
      if (!text) return;
      const detail = /[.!?]$/.test(text) ? text : text + '.';
      const title = error.querySelector('[data-error-title]');
      const message = error.querySelector('[data-error-detail]');
      if (title) title.textContent = 'Not saved';
      if (message) message.textContent = detail + ' Your values are still here.';
    }
    function setFeedback(card, title, detail) {
      const feedback = card?.querySelector('[data-set-feedback]');
      if (!feedback) return;
      const strong = feedback.querySelector('strong');
      const small = feedback.querySelector('small');
      if (strong) strong.textContent = title;
      if (small) small.textContent = detail;
    }
    function setPendingVisual(card, pending, failed = false) {
      const button = card?.querySelector('[data-log-set]');
      const label = button?.querySelector('[data-action-label]');
      if (!button || !label) return;
      if (pending) {
        button.dataset.idleLabel = label.textContent || 'Log set';
        label.textContent = 'Sending set…';
        button.classList.add('is-pending');
        card.querySelector('[data-pending-line]')?.classList.add('is-active');
        setFeedback(card, 'Saving set', 'Values stay in place while this sends.');
      } else {
        label.textContent = failed ? 'Try log set again' : (button.dataset.idleLabel || 'Log set');
        button.classList.toggle('is-error', failed);
        button.classList.remove('is-pending');
        card.querySelector('[data-pending-line]')?.classList.remove('is-active');
      }
    }
    async function startSession() {
      if (session.status !== 'planned') return;
      try {
        await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/start', { idempotency_key: 'start:' + session.id });
        const status = document.querySelector('#statusPill');
        if (status) status.textContent = 'Live';
        session.status = 'active';
      } catch (error) { setToast(error.message); }
    }
    function setReadOnlyAfterComplete() {
      for (const control of document.querySelectorAll('[data-write-control], [data-log-set], [data-step-field], input, textarea')) control.disabled = true;
      if (notes) notes.readOnly = true;
      const status = document.querySelector('#statusPill');
      if (status) status.textContent = 'Completed';
      document.querySelector('.live-state')?.classList.add('is-complete');
      updateProgress();
    }
    function updateProgress() {
      const total = cards.length;
      const done = checked.size;
      const completedCount = document.querySelector('#completedCount');
      if (completedCount) completedCount.textContent = done;
      const routePosition = total ? String(activeIndex + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') : '00 / 00';
      const progressLabel = document.querySelector('#progressLabel');
      if (progressLabel) progressLabel.textContent = routePosition;
      const percent = total ? Math.round((done / total) * 100) : 0;
      const progressPercent = document.querySelector('#progressPercent');
      if (progressPercent) progressPercent.textContent = percent + '% through';
      const progressFill = document.querySelector('#progressFill');
      if (progressFill) progressFill.style.width = percent + '%';
      const bottomName = document.querySelector('#bottomExerciseName');
      if (bottomName) bottomName.textContent = routePosition;
      const prev = document.querySelector('#prevExercise');
      const next = document.querySelector('#nextExercise');
      if (prev) prev.disabled = !total || activeIndex === 0;
      if (next) next.disabled = !total || activeIndex >= total - 1;
    }
    function showExercise(index) {
      if (!cards.length) { updateProgress(); return; }
      activeIndex = Math.max(0, Math.min(index, cards.length - 1));
      for (const [cardIndex, card] of cards.entries()) card.classList.toggle('is-active', cardIndex === activeIndex);
      for (const [contextIndex, context] of contexts.entries()) context.classList.toggle('is-active', contextIndex === activeIndex);
      for (const [routeIndex, item] of routeItems.entries()) {
        item.classList.toggle('is-current', routeIndex === activeIndex);
        item.querySelector('button')?.toggleAttribute('aria-current', routeIndex === activeIndex);
      }
      updateProgress();
      document.querySelector('.workspace-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    async function markExercise(card, completed) {
      if (sessionIsReadOnly() || !card) return false;
      const id = card.dataset.exerciseId;
      const key = 'done:' + id;
      return await withPending(key, async () => {
        const nextChecked = new Set(checked);
        if (completed) nextChecked.add(id); else nextChecked.delete(id);
        await postEvent('exercise_completion_updated', { session_exercise_id: id, completed, completed_ids: [...nextChecked] });
        card.classList.toggle('done', completed);
        const button = contexts[Number(card.dataset.index)]?.querySelector('[data-done]');
        if (button) { button.dataset.completed = String(completed); button.textContent = completed ? 'Movement complete ✓' : 'Mark movement done'; }
        checked.clear();
        for (const checkedId of nextChecked) checked.add(checkedId);
        updateProgress();
        return true;
      });
    }
    function appendSavedSet(card, number, reps, load) {
      const row = card.querySelector('.saved-sets');
      if (!row) return;
      const count = row.querySelector('[data-set-count]');
      if (row.classList.contains('empty')) {
        row.replaceChildren(...(count ? [count] : []));
        row.classList.remove('empty');
        row.setAttribute('aria-label', 'Saved sets');
        const label = document.createElement('span');
        label.className = 'metric-label';
        label.textContent = 'Saved sets';
        row.append(label);
      }
      const item = document.createElement('span');
      const index = document.createElement('b');
      index.textContent = String(number).padStart(2, '0');
      item.append(index, document.createTextNode(' ' + (reps || '—') + '×' + (load || '—')));
      row.append(item);
    }
    async function logSet(card) {
      if (sessionIsReadOnly() || !card) return;
      const id = card.dataset.exerciseId;
      const key = 'set:' + id;
      await withPending(key, async () => {
        setActionError(card, '');
        const load = card.querySelector('[data-load]')?.value.trim();
        const reps = card.querySelector('[data-reps]')?.value.trim();
        const note = card.querySelector('[data-exercise-note]')?.value.trim();
        const count = card.querySelector('[data-set-count]');
        const nextCount = Number(count?.textContent || 0) + 1;
        setPendingVisual(card, true);
        try {
          await postEvent('set_logged', { session_exercise_id: id, load, reps, note, set_number: nextCount }, key + ':' + nextCount + ':' + session.active_version);
          if (count) count.textContent = String(nextCount);
          appendSavedSet(card, nextCount, reps, load);
          const currentSetLabel = card.querySelector('[data-current-set-label]');
          const positionLabel = card.querySelector('[data-position-label]');
          const totalSets = Number(currentSetLabel?.dataset.setTotal || 0);
          const nextSetNumber = totalSets ? Math.min(nextCount + 1, totalSets) : nextCount + 1;
          const plannedSetsComplete = Boolean(totalSets && nextCount >= totalSets);
          if (currentSetLabel) currentSetLabel.textContent = plannedSetsComplete ? 'Extra set' : totalSets ? 'Set ' + nextSetNumber + ' of ' + totalSets : 'Set ' + nextSetNumber;
          if (positionLabel) positionLabel.textContent = plannedSetsComplete ? 'All ' + totalSets + ' logged' : totalSets ? 'Set ' + nextSetNumber + ' of ' + totalSets : 'Set ' + nextSetNumber;
          const button = card.querySelector('[data-log-set]');
          const nextAction = plannedSetsComplete ? 'Add extra set' : 'Log set';
          if (button) {
            button.dataset.idleLabel = nextAction;
            const suffix = button.querySelector('[data-action-suffix]');
            if (suffix) suffix.textContent = String(nextCount + 1).padStart(2, '0') + ' →';
          }
          setPendingVisual(card, false);
          setFeedback(card, 'Set ' + nextCount + ' saved', (reps || '—') + ' reps' + (load ? ' · ' + load : ''));
          setToast(plannedSetsComplete ? 'All planned sets logged' : 'Set saved');
          startRest(card);
        } catch (error) {
          setPendingVisual(card, false, true);
          setActionError(card, error.message || 'Check connection and try again.');
          setFeedback(card, 'Set not saved', 'Your entered values are unchanged.');
          setToast(error.message || 'Save failed');
          throw error;
        }
      });
    }
    function timerState(card) {
      const index = card.dataset.index;
      const start = Number(card.querySelector('[data-rest-row]')?.dataset.restSeconds || 0);
      if (!timers.has(index)) timers.set(index, { seconds: start, start, handle: null });
      return timers.get(index);
    }
    function renderTimer(card, current) {
      const timer = card.querySelector('[data-timer]');
      const state = card.querySelector('[data-timer-state]');
      const button = card.querySelector('[data-action="toggle-timer"]');
      if (timer) timer.textContent = formatTime(current.seconds);
      if (state) state.textContent = current.handle ? 'Running' : current.seconds < current.start ? 'Paused' : 'Idle';
      if (button) button.textContent = current.handle ? 'Pause rest' : current.seconds < current.start ? 'Resume rest' : 'Start rest';
      card.querySelector('[data-rest-row]')?.classList.toggle('timer-active', Boolean(current.handle));
    }
    function pauseTimer(card) {
      const current = timerState(card);
      if (current.handle) clearInterval(current.handle);
      current.handle = null;
      renderTimer(card, current);
    }
    function startRest(card) {
      const current = timerState(card);
      if (current.handle) clearInterval(current.handle);
      if (current.seconds <= 0) current.seconds = current.start;
      if (!current.seconds) { renderTimer(card, current); return; }
      current.handle = setInterval(() => {
        current.seconds = Math.max(0, current.seconds - 1);
        if (!current.seconds) { clearInterval(current.handle); current.handle = null; }
        renderTimer(card, current);
      }, 1000);
      renderTimer(card, current);
    }
    function toggleTimer(card) { const current = timerState(card); current.handle ? pauseTimer(card) : startRest(card); }
    function resetTimer(card) {
      const current = timerState(card);
      if (current.handle) clearInterval(current.handle);
      current.handle = null;
      current.seconds = current.start;
      renderTimer(card, current);
    }
    function adjustField(card, field, direction) {
      const input = card.querySelector('[data-' + field + ']');
      if (!input) return;
      const step = field === 'load' ? 2.5 : 1;
      const value = Number.parseFloat(input.value) || 0;
      input.value = String(Math.max(0, value + (direction === 'up' ? step : -step)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    renderMuscleMaps();
    setupLightbox();
    setupSessionActions();
    startSession();
    setInterval(() => { if (!sessionIsReadOnly()) elapsedSeconds += 1; const elapsed = document.querySelector('#elapsedPill'); if (elapsed) elapsed.textContent = formatTime(elapsedSeconds); }, 1000);
    document.querySelector('#prevExercise')?.addEventListener('click', () => showExercise(activeIndex - 1));
    document.querySelector('#nextExercise')?.addEventListener('click', () => showExercise(activeIndex + 1));
    for (const jump of document.querySelectorAll('[data-exercise-jump]')) jump.addEventListener('click', () => showExercise(Number(jump.dataset.exerciseJump)));

    for (const card of cards) {
      card.querySelector('[data-log-set]')?.addEventListener('click', () => logSet(card).catch(() => null));
      card.querySelectorAll('[data-step-field]').forEach((button) => button.addEventListener('click', () => adjustField(card, button.dataset.stepField, button.dataset.step)));
      card.querySelector('[data-action="toggle-timer"]')?.addEventListener('click', () => toggleTimer(card));
      card.querySelector('[data-action="reset-timer"]')?.addEventListener('click', () => resetTimer(card));
      const context = contexts[Number(card.dataset.index)];
      context?.querySelector('[data-done]')?.addEventListener('click', () => markExercise(card, context.querySelector('[data-done]').dataset.completed !== 'true').catch((error) => setToast(error.message)));
    }

    async function saveNotes() {
      const text = notes?.value.trim() || '';
      if (!text || text === lastSavedNote) return;
      if (noteSavePromise) {
        await noteSavePromise;
        return saveNotes();
      }
      noteSavePromise = postEvent('note_added', { note: text })
        .then(() => { lastSavedNote = text; })
        .finally(() => { noteSavePromise = null; });
      return noteSavePromise;
    }
    saveNote?.addEventListener('click', () => withPending('note', saveNotes).catch((error) => setToast(error.message)));
    for (const button of document.querySelectorAll('[data-effort]')) button.addEventListener('click', () => withPending('effort', () => postEvent('effort_flag_logged', { kind: button.dataset.effort })).then(() => { for (const item of document.querySelectorAll('[data-effort]')) item.setAttribute('aria-pressed', String(item === button)); }).catch((error) => setToast(error.message)));
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
    complete?.addEventListener('click', () => withPending('complete', async () => {
      setToast('Completing…');
      await waitForPendingSets();
      await saveNotes();
      await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/complete', { completion: { completed_at: new Date().toISOString(), notes: notes?.value.trim() || '', completed_exercise_ids: [...checked] } });
      setToast('Completed and logged');
      session.status = 'completed';
      setReadOnlyAfterComplete();
      setTimeout(() => location.reload(), 1000);
    }).catch((error) => setToast(error.message)));
    showExercise(0);
  </script>`;
}
