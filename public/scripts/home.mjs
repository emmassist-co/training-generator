    const profileKey = "trainingCoachProfile";
    let profileId = localStorage.getItem(profileKey) || "default";
    const app = document.getElementById("app");
    const profiles = document.getElementById("profiles");
    function apiUrl(path){ const url = new URL(path, location.href); url.username=""; url.password=""; return url; }
    function escapeHtml(value){ return String(value ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
    function formatDate(value){ if(!value) return "Not dated"; const date = new Date(value); return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(date); }
    function statusLabel(value){ return value === "aborted" ? "canceled" : value; }
    async function load(){
      app.className = "home-loading"; app.textContent = "Loading training state…";
      const res = await fetch(apiUrl('/api/home?profile_id=' + encodeURIComponent(profileId)));
      if(!res.ok){ app.textContent = "Could not load training home."; return; }
      const data = await res.json();
      if(data.profiles?.length && !data.profiles.some(p => p.id === profileId)) { profileId = data.profiles[0].id; localStorage.setItem(profileKey, profileId); return load(); }
      renderProfiles(data.profiles || []); renderHome(data);
    }
    function renderProfiles(items){
      profiles.innerHTML = items.map(p => '<button class="profile-option ' + (p.id===profileId ? 'active' : '') + '" data-profile="' + escapeHtml(p.id) + '">' + escapeHtml(p.name || p.id) + '</button>').join("");
      profiles.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { profileId = btn.dataset.profile; localStorage.setItem(profileKey, profileId); load(); }));
    }
    function sessionFeature(session){
      if(!session) return '<section class="feature"><div class="feature-media"><span class="feature-number">Ready when you are</span><h1 class="feature-media-title">Build the next session</h1></div><div class="feature-body"><div><p class="feature-summary">Use your profile and recent history to create the next focused training session.</p></div><a class="primary-action" href="/chat?profile_id=' + encodeURIComponent(profileId) + '&prompt=Generate%20my%20next%20training%20session"><span>Generate session</span><span>→</span></a></div></section>';
      const exercises = session.exercises || [];
      const image = session.preview_image || "";
      const summary = session.summary || (exercises.length + ' exercises planned');
      const focus = Array.isArray(session.focus) && session.focus.length ? session.focus.join(' · ') : 'Structured training';
      return '<section class="feature"><div class="feature-media ' + (image ? 'has-image' : '') + '">' + (image ? '<img src="' + escapeHtml(image) + '" alt="" />' : '') + '<span class="feature-number">' + escapeHtml(focus) + '</span><h1 class="feature-media-title">' + escapeHtml(session.title) + '</h1></div><div class="feature-body"><div><div class="feature-status status-mark">' + escapeHtml(session.status) + '</div><p class="feature-summary">' + escapeHtml(summary) + '</p><div class="feature-metrics"><div class="feature-metric"><span class="micro-label">Movements</span><strong>' + exercises.length + '</strong></div><div class="feature-metric"><span class="micro-label">Status</span><strong>' + escapeHtml(session.status) + '</strong></div><div class="feature-metric"><span class="micro-label">Planned</span><strong>' + escapeHtml(formatDate(session.planned_at)) + '</strong></div></div></div><a class="primary-action" href="/sessions/' + encodeURIComponent(session.id) + '"><span>' + (session.status === 'active' ? 'Resume session' : 'Open session') + '</span><span>→</span></a></div></section>';
    }
    function renderHome(data){
      const recent = data.recent_sessions || [];
      const recentHtml = recent.length ? recent.map((s,index) => '<a class="recent-row" href="/sessions/' + encodeURIComponent(s.id) + '"><span class="recent-index">' + String(index + 1).padStart(2,'0') + '</span><span><strong>' + escapeHtml(s.title) + '</strong><span class="recent-meta"><span>' + escapeHtml(s.summary || ((s.exercise_count || 0) + ' movements')) + '</span><span class="recent-status">' + escapeHtml(statusLabel(s.status)) + '</span></span></span></a>').join("") : '<p class="empty-copy">No saved sessions yet.</p>';
      app.className = "home-grid";
      app.innerHTML = '<aside class="home-rail"><span class="micro-label">Route / 01</span><strong class="rail-index">Today</strong><p class="rail-copy">Your current training task, recent work, and coach stay one step away.</p><nav class="quick-list" aria-label="Training actions"><a class="text-action" href="/chat?profile_id=' + encodeURIComponent(profileId) + '">Ask coach</a><a class="text-action" href="/history?profile_id=' + encodeURIComponent(profileId) + '">Review history</a><button class="text-action" id="log-done">Log completed work</button><a class="text-action" href="/chat?profile_id=' + encodeURIComponent(profileId) + '&prompt=What%20should%20I%20train%20today%3F">What today?</a></nav></aside><section class="home-main"><header class="today-head"><div><p class="kicker">Current work</p><h2 class="section-title">Training today</h2></div><span class="micro-label">' + escapeHtml(profileId) + '</span></header>' + sessionFeature(data.active_session) + '</section><aside class="home-history"><header class="history-head"><div><p class="kicker">Recent</p><h2 class="section-title">Last sessions</h2></div><span class="history-count">' + recent.length + '</span></header><div class="recent-list">' + recentHtml + '</div></aside>';
      const featureImage = document.querySelector('.feature-media img');
      if(featureImage){
        const showFallback = () => { featureImage.closest('.feature-media')?.classList.remove('has-image'); featureImage.remove(); };
        if(featureImage.complete && !featureImage.naturalWidth) showFallback();
        else featureImage.addEventListener('error', showFallback, { once: true });
      }
      document.getElementById("log-done")?.addEventListener("click", () => location.href = '/chat?profile_id=' + encodeURIComponent(profileId) + '&prompt=Log%20a%20training%20session%20I%20already%20completed');
    }
    load();
