import { scriptJson } from "./live-session-html.mjs";

export function renderLiveSessionRuntime(runtimeData) {
  return String.raw`<script type="module">
    window.__LIVE_SESSION__ = ${scriptJson(runtimeData)};
    const liveSession = window.__LIVE_SESSION__;
    const session = liveSession.session;
    const exerciseNames = liveSession.exerciseNames;
    const toast = document.querySelector('#toast');
    const notes = document.querySelector('#notes');
    const complete = document.querySelector('#complete');
    const saveNote = document.querySelector('#saveNote');
    const cards = [...document.querySelectorAll('.exercise-card')];
    const checked = new Set(session.completed_exercise_ids || []);
    const timers = new Map();
    const pendingActions = new Set();
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
    async function postEvent(type, payload, idempotencyKey) {
      setToast('Saving…');
      const event = await postJson('/api/sessions/' + encodeURIComponent(session.id) + '/events', { type, version: session.active_version, payload, idempotency_key: idempotencyKey || type + ':' + crypto.randomUUID() });
      setToast('Saved');
      return event;
    }
    function buttonsForKey(key) { return [...document.querySelectorAll('[data-action-key="' + CSS.escape(key) + '"]')]; }
    async function withPending(key, fn) {
      if (pendingActions.has(key)) return null;
      pendingActions.add(key);
      for (const button of buttonsForKey(key)) button.disabled = true;
      try { return await fn(); }
      finally {
        pendingActions.delete(key);
        if (session.status !== 'completed') {
          for (const button of buttonsForKey(key)) button.disabled = false;
        }
      }
    }
    function setActionError(card, text) {
      const error = card?.querySelector('[data-error]');
      if (error) error.textContent = text || '';
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
      const currentId = cards[activeIndex]?.dataset.exerciseId;
      document.querySelector('#bottomDone').disabled = !currentId || session.status === 'completed';
    }
    function showExercise(index) {
      if (!cards.length) return;
      activeIndex = Math.max(0, Math.min(index, cards.length - 1));
      for (const [cardIndex, card] of cards.entries()) card.classList.toggle('is-active', cardIndex === activeIndex);
      updateProgress();
    }
    async function markExercise(card, completed) {
      if (session.status === 'completed' || !card) return false;
      const id = card.dataset.exerciseId;
      const key = 'done:' + id;
      return await withPending(key, async () => {
        const nextChecked = new Set(checked);
        if (completed) nextChecked.add(id); else nextChecked.delete(id);
        await postEvent('exercise_completion_updated', { session_exercise_id: id, completed, completed_ids: [...nextChecked] });
        card.classList.toggle('done', completed);
        card.querySelector('[data-done]').dataset.completed = String(completed);
        card.querySelector('[data-done]').textContent = completed ? 'Done' : 'Mark done';
        checked.clear();
        for (const checkedId of nextChecked) checked.add(checkedId);
        updateProgress();
        return true;
      });
    }
    async function logSet(card) {
      if (session.status === 'completed' || !card) return;
      const id = card.dataset.exerciseId;
      const key = 'set:' + id;
      await withPending(key, async () => {
        setActionError(card, '');
        const load = card.querySelector('[data-load]')?.value.trim();
        const reps = card.querySelector('[data-reps]')?.value.trim();
        const note = card.querySelector('[data-exercise-note]')?.value.trim();
        const count = card.querySelector('[data-set-count]');
        const nextCount = Number(count.textContent || 0) + 1;
        try {
          await postEvent('set_logged', { session_exercise_id: id, load, reps, note, set_number: nextCount }, key + ':' + nextCount + ':' + session.active_version);
          count.textContent = String(nextCount);
          const currentSetLabel = card.querySelector('[data-current-set-label]');
          const totalSets = Number(currentSetLabel?.dataset.setTotal || 0);
          const nextSetNumber = totalSets ? Math.min(nextCount + 1, totalSets) : nextCount + 1;
          const plannedSetsComplete = Boolean(totalSets && nextCount >= totalSets);
          if (currentSetLabel) currentSetLabel.textContent = plannedSetsComplete ? 'All ' + totalSets + ' sets logged' : totalSets ? 'Set ' + nextSetNumber + ' of ' + totalSets : 'Set ' + nextSetNumber;
          for (const button of buttonsForKey(key)) button.textContent = plannedSetsComplete ? 'Add extra set' : 'Log set';
          card.querySelector('[data-rest-row]')?.classList.add('timer-active');
          updateProgress();
          setToast(plannedSetsComplete ? 'All planned sets logged' : 'Set saved');
          resetTimer(card);
        } catch (error) {
          setActionError(card, error.message || 'Save failed. Check connection and try again.');
          setToast(error.message || 'Save failed');
          throw error;
        }
      });
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
        card.querySelector('[data-rest-row]')?.classList.add('timer-active');
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
    document.querySelector('#bottomDone')?.addEventListener('click', async () => {
      try {
        const advanced = await markExercise(cards[activeIndex], true);
        if (advanced && activeIndex < cards.length - 1) showExercise(activeIndex + 1);
      } catch (error) { setToast(error.message); }
    });

    for (const card of cards) {
      card.querySelector('[data-log-set]')?.addEventListener('click', () => logSet(card).catch((error) => setToast(error.message)));
      card.querySelector('[data-done]')?.addEventListener('click', () => markExercise(card, card.querySelector('[data-done]').dataset.completed !== 'true').catch((error) => setToast(error.message)));
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
  </script>`;
}
