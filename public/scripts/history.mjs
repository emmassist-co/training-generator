    const params = new URLSearchParams(location.search);
    const profileId = params.get('profile_id') || localStorage.getItem('trainingCoachProfile') || 'default';
    let status = '';
    const dateFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const list = document.getElementById('list');
    const count = document.getElementById('historyCount');
    function apiUrl(path){ const url = new URL(path, location.href); url.username=''; url.password=''; return url; }
    function escapeHtml(value){ return String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
    function formatDate(value){ if(!value) return 'Not dated'; const date = new Date(value); return Number.isNaN(date.valueOf()) ? String(value) : dateFormatter.format(date); }
    function statusLabel(value){ return value === 'aborted' ? 'canceled' : value; }
    async function load(){
      list.className='history-list'; list.innerHTML='<p class="history-loading">Loading history…</p>'; count.textContent='—';
      const qs = new URLSearchParams({ profile_id: profileId, limit: '30' }); if(status) qs.set('status', status);
      const res = await fetch(apiUrl('/api/sessions?' + qs));
      if(!res.ok){ list.innerHTML='<p class="history-empty">Could not load history.</p>'; return; }
      const data = await res.json(); const sessions = data.sessions || []; count.textContent=String(sessions.length).padStart(2,'0');
      list.innerHTML = sessions.length ? sessions.map((s,index) => '<a class="history-row" href="/sessions/' + encodeURIComponent(s.id) + '"><span class="row-index">' + String(index + 1).padStart(2,'0') + '</span><span class="row-title"><strong>' + escapeHtml(s.title) + '</strong><span class="row-summary">' + escapeHtml(s.summary || 'Structured training session') + '</span><span class="row-status status-mark">' + escapeHtml(statusLabel(s.status)) + '</span></span><span class="row-data row-count"><span class="micro-label">Movements</span><strong>' + escapeHtml(s.exercise_count || 0) + '</strong></span><span class="row-data row-date"><span class="micro-label">Date</span><strong>' + escapeHtml(formatDate(s.completed_at || s.planned_at)) + '</strong></span><span class="row-arrow">→</span></a>').join('') : '<p class="history-empty">No sessions found.</p>';
    }
    document.querySelectorAll('[data-status]').forEach(btn => btn.addEventListener('click', () => { status = btn.dataset.status; document.querySelectorAll('[data-status]').forEach(b => b.classList.toggle('active', b === btn)); load(); }));
    load();
