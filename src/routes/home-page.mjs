export function renderHomePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Training Home</title>
  <style>
    :root { color-scheme: dark; --bg:#080a0f; --panel:#111722; --panel2:#151d2a; --text:#f4f7fb; --muted:#91a0b5; --line:#263245; --accent:#9be7c2; --warn:#ffd28a; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:radial-gradient(circle at top left,#182235 0,#080a0f 42rem); color:var(--text); }
    a { color:inherit; text-decoration:none; }
    .shell { width:min(1160px,100%); margin:0 auto; padding:24px; }
    header { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:24px; }
    h1 { margin:0; font-size:clamp(32px,7vw,72px); letter-spacing:-.06em; line-height:.88; }
    .eyebrow { color:var(--accent); text-transform:uppercase; letter-spacing:.18em; font-size:12px; font-weight:700; }
    .nav { display:flex; gap:10px; flex-wrap:wrap; }
    .pill,.button { border:1px solid var(--line); border-radius:999px; padding:10px 14px; background:rgba(255,255,255,.04); color:var(--text); cursor:pointer; }
    .pill.active { border-color:var(--accent); color:#06110c; background:var(--accent); }
    .grid { display:grid; grid-template-columns:1.15fr .85fr; gap:18px; }
    .card { background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03)); border:1px solid var(--line); border-radius:28px; padding:22px; box-shadow:0 24px 80px rgba(0,0,0,.28); }
    .card h2 { margin:0 0 8px; font-size:28px; letter-spacing:-.04em; }
    .muted { color:var(--muted); }
    .primary { display:inline-flex; margin-top:18px; background:var(--text); color:#06080d; border-radius:18px; padding:14px 18px; font-weight:800; }
    .quick { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:18px; }
    .quick a, .quick button { text-align:left; border:1px solid var(--line); border-radius:20px; padding:16px; background:var(--panel); color:var(--text); font:inherit; cursor:pointer; }
    .list { display:grid; gap:10px; margin-top:12px; }
    .row { display:flex; justify-content:space-between; gap:14px; padding:14px; border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,.035); }
    .status { color:var(--warn); font-size:12px; text-transform:uppercase; letter-spacing:.12em; }
    .loading { min-height:220px; display:grid; place-items:center; color:var(--muted); }
    @media (max-width: 760px) { .shell{padding:18px;} header{align-items:flex-start; flex-direction:column;} .grid{grid-template-columns:1fr;} .quick{grid-template-columns:1fr;} .card{border-radius:22px;} }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <div>
        <div class="eyebrow">training generator</div>
        <h1>Training home</h1>
      </div>
      <nav class="nav"><a class="button" href="/chat">Coach chat</a><a class="button" href="/history">History</a></nav>
    </header>
    <section id="profiles" class="nav" aria-label="Profiles"></section>
    <section id="app" class="loading">Loading training state…</section>
  </main>
  <script type="module">
    const profileKey = "trainingCoachProfile";
    let profileId = localStorage.getItem(profileKey) || "default";
    const app = document.getElementById("app");
    const profiles = document.getElementById("profiles");
    function apiUrl(path){ const url = new URL(path, location.href); url.username=""; url.password=""; return url; }
    function escapeHtml(value){ return String(value ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
    async function load(){
      app.className = "loading"; app.textContent = "Loading training state…";
      const res = await fetch(apiUrl('/api/home?profile_id=' + encodeURIComponent(profileId)));
      if(!res.ok){ app.textContent = "Could not load training home."; return; }
      const data = await res.json();
      if(data.profiles?.length && !data.profiles.some(p => p.id === profileId)) {
        profileId = data.profiles[0].id;
        localStorage.setItem(profileKey, profileId);
        return load();
      }
      renderProfiles(data.profiles || []);
      renderHome(data);
    }
    function renderProfiles(items){
      profiles.innerHTML = items.map(p => '<button class="pill ' + (p.id===profileId ? 'active' : '') + '" data-profile="' + escapeHtml(p.id) + '">' + escapeHtml(p.name || p.id) + '</button>').join("");
      profiles.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { profileId = btn.dataset.profile; localStorage.setItem(profileKey, profileId); load(); }));
    }
    function sessionCard(session){
      if(!session) return '<p class="muted">No active session. Generate the next one with the coach when you are ready.</p><a class="primary" href="/chat?profile_id=' + encodeURIComponent(profileId) + '&prompt=Generate%20my%20next%20training%20session">Generate next session</a>';
      const summary = session.summary || ((session.exercises?.length || 0) + ' exercises planned');
      return '<div class="status">' + escapeHtml(session.status) + '</div><h2>' + escapeHtml(session.title) + '</h2><p class="muted">' + escapeHtml(summary) + '</p><a class="primary" href="/sessions/' + encodeURIComponent(session.id) + '">Resume session</a>';
    }
    function renderHome(data){
      const recent = data.recent_sessions || [];
      app.className = "grid";
      const recentHtml = recent.length ? recent.map(s => '<a class="row" href="/sessions/' + encodeURIComponent(s.id) + '"><span><strong>' + escapeHtml(s.title) + '</strong><br><span class="muted">' + escapeHtml(s.summary || ((s.exercise_count || 0) + ' exercises')) + '</span></span><span class="status">' + escapeHtml(s.status) + '</span></a>').join("") : '<p class="muted">No saved sessions yet.</p>';
      app.innerHTML = '<section class="card">' + sessionCard(data.active_session) + '<div class="quick"><a href="/chat?profile_id=' + encodeURIComponent(profileId) + '">Ask coach</a><a href="/history?profile_id=' + encodeURIComponent(profileId) + '">Review history</a><button id="log-done">Log completed work</button><a href="/chat?profile_id=' + encodeURIComponent(profileId) + '&prompt=What%20should%20I%20train%20today%3F">What today?</a></div></section><aside class="card"><div class="eyebrow">recent</div><h2>Last sessions</h2><div class="list">' + recentHtml + '</div></aside>';
      document.getElementById("log-done")?.addEventListener("click", () => location.href = '/chat?profile_id=' + encodeURIComponent(profileId) + '&prompt=Log%20a%20training%20session%20I%20already%20completed');
    }
    load();
  </script>
</body>
</html>`;
}
