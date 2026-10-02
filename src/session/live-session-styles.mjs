export const LIVE_SESSION_CSS = String.raw`    :root { color-scheme: dark; --bg:#050706; --panel:rgba(13,18,17,.92); --panel2:rgba(255,255,255,.055); --line:rgba(213,255,234,.14); --text:#f6faf8; --muted:#9aa9a4; --muted2:#66736f; --accent:#8dffcb; --accent2:#d9fff1; --danger:#ffb4a8; --warn:#ffd28a; --shadow:0 24px 90px rgba(0,0,0,.42); }
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
    @media (max-width:760px) { main { padding:8px 8px 88px; } .hero, .exercise-card, .panel { border-radius:24px; } .media-grid { grid-template-columns:1fr; min-height:0; } .exercise-media { min-height:210px; } .exercise-copy { padding:16px; } .set-counters, .field-grid { grid-template-columns:1fr; } .bottom-bar { grid-template-columns:76px 1fr; border-radius:22px; padding:7px; } .bottom-title { display:none; } .bottom-actions { display:grid; grid-template-columns:.85fr 1fr 1.25fr; } .bottom-actions button, #prevExercise { min-height:48px; padding:0 9px; border-radius:16px; } }`;
