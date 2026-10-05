export const HISTORY_PAGE_CSS = String.raw`
    .history-page{padding-bottom:40px}
    .history-intro{min-height:250px;padding:32px 0;border-bottom:1px solid var(--rule);display:grid;grid-template-columns:220px 30px minmax(0,1fr);align-items:end}
    .history-route{align-self:stretch;padding-right:29px;border-right:1px solid var(--rule);display:flex;flex-direction:column;justify-content:space-between}
    .history-route strong{font:600 54px/.8 var(--display)}
    .history-title{grid-column:3;max-width:800px}
    .history-title p:last-child{max-width:560px;margin:18px 0 0;color:var(--muted)}
    .history-controls{min-height:64px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:stretch;gap:20px}
    .filters{display:flex;align-items:stretch;overflow-x:auto}
    .filter{min-width:92px;min-height:44px;padding:0 15px;border:0;border-left:1px solid var(--rule);background:transparent;color:var(--muted);font:600 12px/1 var(--display);letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
    .filter:last-child{border-right:1px solid var(--rule)}
    .filter.active{color:var(--accent);box-shadow:inset 0 -2px var(--accent)}
    .history-total{display:flex;align-items:center;gap:10px;color:var(--muted);font:600 11px var(--display);letter-spacing:.1em;text-transform:uppercase}
    .history-total strong{color:var(--ink);font-size:21px}
    .history-list{display:grid}
    .history-row{min-height:112px;border-bottom:1px solid var(--rule);display:grid;grid-template-columns:60px minmax(0,1fr) 150px 120px 36px;align-items:center;gap:16px;transition:background-color 120ms ease}
    .history-row:hover{background:var(--surface)}
    .row-index{color:var(--dim);font:600 12px var(--display);letter-spacing:.08em}
    .row-title{min-width:0}
    .row-title strong{display:block;font:700 clamp(24px,3vw,39px)/.9 var(--display);letter-spacing:-.015em;text-transform:uppercase;overflow-wrap:anywhere}
    .row-summary{margin-top:8px;color:var(--muted);font-size:12px;line-height:1.45;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}
    .row-data{display:grid;gap:6px}
    .row-data strong{font:600 17px/1 var(--display);text-transform:uppercase}
    .row-status{justify-self:start;margin-top:8px}
    .row-arrow{color:var(--accent);font:600 25px var(--display)}
    .history-empty,.history-loading{min-height:220px;border-bottom:1px solid var(--rule);display:grid;place-items:center;color:var(--muted)}
    @media(max-width:900px){.history-intro{grid-template-columns:160px 24px minmax(0,1fr)}.history-row{grid-template-columns:44px minmax(0,1fr) 110px 36px}.row-date{display:none}}
    @media(max-width:767px){.history-page{padding-bottom:24px}.history-intro{min-height:190px;padding:24px 0;display:block}.history-route{display:none}.history-title{max-width:none}.history-controls{display:block;padding-top:0}.filters{width:100%}.filter{flex:1;min-width:76px;padding-inline:8px}.history-total{display:none}.history-row{min-height:102px;grid-template-columns:30px minmax(0,1fr) 30px;gap:10px}.row-count,.row-date{display:none}.row-title strong{font-size:27px}.row-status{margin-top:9px}.row-arrow{justify-self:end}}
`;
